import { afterEach, describe, expect, it } from 'bun:test';

/**
 * Pins the Bun websocket `idleTimeout` + `sendPings` semantics the mesh relies on
 * (#488): with `sendPings` (default true) the server pings at the protocol level
 * and every real client runtime auto-pongs, so
 *
 *   1. a quiet-but-healthy client survives past `idleTimeout` (the fear that led
 *      to timeouts being deactivated originally — pongs count as activity), and
 *   2. a dead client (completes the handshake, then never answers anything) is
 *      closed by the server within roughly `idleTimeout`, which is what bounds
 *      how long a zombie registration can linger on the mesh.
 *
 * The test server mirrors the mesh's shape: server-level `idleTimeout: 0` (HTTP)
 * with the timeout set on the websocket handler.
 */

const IDLE_TIMEOUT_S = 4;
// Past one full idle window with margin, well under two.
const SURVIVE_MS = (IDLE_TIMEOUT_S + 2) * 1_000;
// A dead client should be reaped within ~2 windows; allow one extra as slack.
const REAP_DEADLINE_MS = (IDLE_TIMEOUT_S * 3) * 1_000;

const waitFor = async (
    predicate: () => boolean,
    timeoutMs: number,
): Promise<boolean> => {
    const startedAt = Date.now();

    while (!predicate()) {
        if (Date.now() - startedAt > timeoutMs) {
            return false;
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return true;
};

describe('mesh websocket idleTimeout + sendPings semantics (#488)', () => {
    const stops: (() => void)[] = [];

    afterEach(() => {
        for (const stop of stops.splice(0)) {
            stop();
        }
    });

    const startServer = (
    ): { port: number; closedSockets: number; onClose: () => number } => {
        const state = { closed: 0 };

        const server = Bun.serve({
            port: 0,
            idleTimeout: 0,
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
                idleTimeout: IDLE_TIMEOUT_S,
                message(
                ) {
                    // Quiet server — activity must come from protocol ping/pong alone
                },
                close(
                ) {
                    state.closed++;
                },
            },
        });

        stops.push(() => {
            void server.stop(true);
        });

        return {
            port: server.port,
            closedSockets: state.closed,
            onClose: () => state.closed,
        };
    };

    it('keeps a quiet-but-healthy client (runtime auto-pongs) alive past the idle window', async () => {
        const harness = startServer();

        const client = new WebSocket(`ws://localhost:${harness.port}`);
        stops.push(() => {
            client.close();
        });

        await new Promise<void>((resolve, reject) => {
            client.onopen = () => resolve();
            client.onerror = () => reject(new Error('connect failed'));
        });

        await new Promise((resolve) => setTimeout(resolve, SURVIVE_MS));

        expect(client.readyState).toBe(WebSocket.OPEN);
        expect(harness.onClose()).toBe(0);
    }, SURVIVE_MS + 5_000);

    it('closes a dead client (handshake, then total silence — no pongs) within the idle window', async () => {
        const harness = startServer();

        // A raw TCP socket that completes the websocket handshake and then plays
        // dead: it never answers protocol pings (a real runtime would auto-pong),
        // which is the server-side view of a half-open/hung peer.
        const socket = await Bun.connect({
            hostname: 'localhost',
            port: harness.port,
            socket: {
                data(
                ) {
                    // Read and ignore everything — never respond
                },
                error(
                ) {
                    // Ignore — the server tearing us down is the expected outcome
                },
            },
        });
        stops.push(() => {
            socket.end();
        });

        socket.write(
            'GET / HTTP/1.1\r\n'
            + `Host: localhost:${harness.port}\r\n`
            + 'Upgrade: websocket\r\n'
            + 'Connection: Upgrade\r\n'
            + `Sec-WebSocket-Key: ${btoa('0123456789abcdef')}\r\n`
            + 'Sec-WebSocket-Version: 13\r\n'
            + '\r\n',
        );

        const reaped = await waitFor(() => harness.onClose() >= 1, REAP_DEADLINE_MS);

        expect(reaped).toBe(true);
    }, REAP_DEADLINE_MS + 5_000);
});
