import { afterEach, describe, expect, it } from 'bun:test';
import { HEARTBEAT_PING, HEARTBEAT_PONG } from '@flux/shared/types';
import { WebSocketClient } from './ws-client';

/**
 * A minimal in-process mesh stand-in. `answerPings` controls whether the server
 * behaves like a healthy mesh (echo pong) or a dead path (swallow the ping —
 * the client-side view of a half-open socket, since no close frame is sent).
 */
const startServer = (
    options: { answerPings: boolean },
): { server: ReturnType<typeof Bun.serve>; received: string[]; stop: () => void } => {
    const received: string[] = [];

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

                if (options.answerPings && message === HEARTBEAT_PING) {
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
        const harness = startServer({ answerPings: true });
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
        const harness = startServer({ answerPings: true });
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
        const harness = startServer({ answerPings: false });
        servers.push(harness);

        let closed = false;
        const client = makeClient(`ws://localhost:${harness.server.port}`, 20);
        client.on('close', () => {
            closed = true;
        });

        await client.connect();

        // First tick sends the ping, second tick sees the missing pong.
        await waitFor(() => closed, 1_000);

        expect(closed).toBe(true);
    });

    it('re-enters the connect loop after a heartbeat-detected death when autoReconnect is on', async () => {
        const harness = startServer({ answerPings: false });
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

    it('does not heartbeat when the interval is disabled (0)', async () => {
        const harness = startServer({ answerPings: true });
        servers.push(harness);

        const client = makeClient(`ws://localhost:${harness.server.port}`, 0);
        await client.connect();

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(harness.received.filter((message) => message === HEARTBEAT_PING)).toHaveLength(0);
    });
});
