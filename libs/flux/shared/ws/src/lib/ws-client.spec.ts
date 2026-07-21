import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { HEARTBEAT_PING, HEARTBEAT_PONG } from '@flux/shared/types';
import { WebSocketClient } from './ws-client';

/**
 * A minimal in-process mesh stand-in. `answerPings` controls how the server
 * behaves: 'always' is a healthy new mesh, 'never' is an old mesh without
 * heartbeat support, and 'once' answers the first ping then goes silent — the
 * client-side view of a connection that died half-open (no close frame).
 */
const startServer = (
    options: { answerPings: 'always' | 'never' | 'once' },
): { server: ReturnType<typeof Bun.serve>; received: string[]; stop: () => void } => {
    const received: string[] = [];
    let pongsSent = 0;

    const server = Bun.serve({
        port: 0,
        fetch(
            request,
            server_,
        ) {
            if (server_.upgrade(request)) {
                return undefined;
            }

            return new Response('Upgrade failed', { status: 500 });
        },
        websocket: {
            message(
                ws,
                message,
            ) {
                received.push(String(message));

                if (message !== HEARTBEAT_PING) {
                    return;
                }

                const shouldPong: boolean = options.answerPings === 'always'
                    || (options.answerPings === 'once' && pongsSent === 0);

                if (shouldPong) {
                    pongsSent++;
                    ws.send(HEARTBEAT_PONG);
                }
            },
        },
    });

    return {
        server,
        received,
        stop: () => {
            server.stop(true);
        },
    };
};

/**
 * A mesh that is reachable at the TCP level but never completes the WebSocket
 * upgrade — the client's `connect()` can only ever end in `Connection timeout`.
 * This is the shape of the outage that killed a consumer process (#493).
 */
const startHangingServer = (
): { server: ReturnType<typeof Bun.serve>; stop: () => void } => {
    const server = Bun.serve({
        port: 0,
        fetch(
        ) {
            // Never resolves: the upgrade handshake is left open forever.
            return new Promise<Response>(() => undefined);
        },
    });

    return {
        server,
        stop: () => {
            server.stop(true);
        },
    };
};

const waitFor = async (
    predicate: () => boolean,
    timeoutMs: number,
): Promise<void> => {
    const startedAt = Date.now();

    while (!predicate()) {
        if (Date.now() - startedAt > timeoutMs) {
            throw new Error('waitFor timed out');
        }

        await new Promise((resolve) => setTimeout(resolve, 5));
    }
};

describe('WebSocketClient heartbeat (#488)', () => {
    const clients: WebSocketClient<string>[] = [];
    const servers: { stop: () => void }[] = [];

    const makeClient = (
        url: string,
        heartbeatInterval: number,
        autoReconnect: boolean = false,
    ): WebSocketClient<string> => {
        const client = new WebSocketClient<string>({
            url,
            autoReconnect,
            reconnectDelay: 10,
            heartbeatInterval,
        });
        clients.push(client);

        return client;
    };

    afterEach(() => {
        for (const client of clients.splice(0)) {
            client.close();
        }
        for (const server of servers.splice(0)) {
            server.stop();
        }
    });

    it('pings on the interval and stays connected while the server pongs', async () => {
        const harness = startServer({ answerPings: 'always' });
        servers.push(harness);

        let closed = false;
        const client = makeClient(`ws://localhost:${harness.server.port}`, 20);
        client.on('close', () => {
            closed = true;
        });

        await client.connect();
        await waitFor(() => harness.received.filter((message) => message === HEARTBEAT_PING).length >= 3, 1_000);

        expect(closed).toBe(false);
    });

    it('does not deliver heartbeat pongs to message listeners', async () => {
        const harness = startServer({ answerPings: 'always' });
        servers.push(harness);

        const messages: string[] = [];
        const client = makeClient(`ws://localhost:${harness.server.port}`, 20);
        client.on('message', (message: string) => {
            messages.push(message);
        });

        await client.connect();
        await waitFor(() => harness.received.filter((message) => message === HEARTBEAT_PING).length >= 2, 1_000);

        expect(messages).not.toContain(HEARTBEAT_PONG);
    });

    it('treats a missed pong as a disconnect (the half-open case) and emits close', async () => {
        // Pongs once (proving heartbeat support), then goes silent — a dead path.
        const harness = startServer({ answerPings: 'once' });
        servers.push(harness);

        let closed = false;
        const client = makeClient(`ws://localhost:${harness.server.port}`, 20);
        client.on('close', () => {
            closed = true;
        });

        await client.connect();

        await waitFor(() => closed, 1_000);

        expect(closed).toBe(true);
    });

    it('re-enters the connect loop after a heartbeat-detected death when autoReconnect is on', async () => {
        const harness = startServer({ answerPings: 'once' });
        servers.push(harness);

        let connectingEvents = 0;
        const client = makeClient(`ws://localhost:${harness.server.port}`, 20, true);
        client.on('connecting', () => {
            connectingEvents++;
        });

        await client.connect();

        // 1 initial + at least 1 reconnect attempt after the missed pong
        await waitFor(() => connectingEvents >= 2, 2_000);

        expect(connectingEvents).toBeGreaterThanOrEqual(2);
    });

    it('keeps the connection alive against a server without heartbeat support (old mesh)', async () => {
        const harness = startServer({ answerPings: 'never' });
        servers.push(harness);

        let closed = false;
        const client = makeClient(`ws://localhost:${harness.server.port}`, 20);
        client.on('close', () => {
            closed = true;
        });

        await client.connect();

        // Enough time for several would-be deadlines to pass.
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(closed).toBe(false);
    });

    it('does not heartbeat when the interval is disabled (0)', async () => {
        const harness = startServer({ answerPings: 'always' });
        servers.push(harness);

        const client = makeClient(`ws://localhost:${harness.server.port}`, 0);
        await client.connect();

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(harness.received.filter((message) => message === HEARTBEAT_PING)).toHaveLength(0);
    });
});

describe('WebSocketClient reconnect against an unreachable mesh (#493)', () => {
    const clients: WebSocketClient<string>[] = [];
    const servers: { stop: () => void }[] = [];
    const unhandled: unknown[] = [];

    const recordUnhandled = (
        reason: unknown,
    ): void => {
        unhandled.push(reason);
    };

    beforeEach(() => {
        unhandled.splice(0);
        process.on('unhandledRejection', recordUnhandled);
    });

    afterEach(() => {
        process.off('unhandledRejection', recordUnhandled);

        for (const client of clients.splice(0)) {
            client.close();
        }
        for (const server of servers.splice(0)) {
            server.stop();
        }
    });

    const makeReconnectingClient = (
        url: string,
        reconnectDelay: number,
    ): WebSocketClient<string> => {
        const client = new WebSocketClient<string>({
            url,
            autoReconnect: true,
            reconnectDelay,
            maxReconnectDelay: 10_000,
            connectionTimeout: 30,
            heartbeatInterval: 0,
        });
        clients.push(client);

        return client;
    };

    it('never leaks the scheduled reconnect rejection (the crash)', async () => {
        // The scheduled reconnect's promise belongs to a timer no consumer owns, so
        // an unhandled rejection here is fatal under Bun regardless of what the
        // caller does. Retrying at all must not be able to kill the process.
        const harness = startHangingServer();
        servers.push(harness);

        const errors: Error[] = [];
        const client = makeReconnectingClient(`ws://localhost:${harness.server.port}`, 20);
        client.on('error', (error: Error) => {
            errors.push(error);
        });

        // The first attempt is the caller's own promise and may reject legitimately.
        await client.connect().catch(() => undefined);

        // Sit through several failed reconnects.
        await waitFor(() => errors.length >= 2, 3_000);

        // Give any leaked rejection a turn of the loop to surface.
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(unhandled).toHaveLength(0);
        expect(errors.map((error) => error.message)).toContain('Connection timeout');
    });

    it('backs off exponentially instead of hammering at a fixed delay', async () => {
        const harness = startHangingServer();
        servers.push(harness);

        const attemptAt: number[] = [];
        const client = makeReconnectingClient(`ws://localhost:${harness.server.port}`, 60);
        client.on('connecting', () => {
            attemptAt.push(Date.now());
        });

        await client.connect().catch(() => undefined);

        await waitFor(() => attemptAt.length >= 4, 5_000);

        // Each gap is `connectionTimeout` plus that attempt's delay, so a constant
        // delay would make every gap equal. Exponential growth must be visible even
        // with timer jitter: delays run 60, 120, 240ms.
        const firstGap: number = attemptAt[1] - attemptAt[0];
        const thirdGap: number = attemptAt[3] - attemptAt[2];

        expect(thirdGap).toBeGreaterThan(firstGap + 60);
    });

    it('stops retrying once `retries` is exhausted and reports it', async () => {
        const harness = startHangingServer();
        servers.push(harness);

        const errors: Error[] = [];
        const client = new WebSocketClient<string>({
            url: `ws://localhost:${harness.server.port}`,
            autoReconnect: true,
            reconnectDelay: 10,
            connectionTimeout: 30,
            heartbeatInterval: 0,
            retries: 2,
        });
        clients.push(client);
        client.on('error', (error: Error) => {
            errors.push(error);
        });

        await client.connect().catch(() => undefined);

        await waitFor(() => errors.some((error) => error.message.includes('retries exhausted')), 3_000);

        expect(unhandled).toHaveLength(0);
    });
});
