import { afterEach, describe, expect, it } from 'bun:test';
import { AuthenticationError, EndpointNotFoundError } from '@flux/shared/utils';
import { FluxAgent } from './flux-agent.class';

/**
 * The behaviour this file exists for: an Agent that meets an unreachable mesh
 * must keep trying and connect on its own once the mesh returns.
 *
 * Before this, `connect()` rejected roughly 6ms in with "Unable to connect" and
 * the SDK did nothing further — no WebSocket had been created yet, so the
 * ws-client's `autoReconnect` had nothing to reconnect. Every consumer had to
 * discover that and write its own backoff wrapper, while an Authority in the
 * same situation retried through it. These assert the two now agree.
 */

const waitFor = async (
    predicate: () => boolean,
    timeoutMs: number,
): Promise<void> => {
    const startedAt: number = Date.now();

    while (!predicate()) {
        if (Date.now() - startedAt > timeoutMs) {
            throw new Error('waitFor timed out');
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
    }
};

describe('FluxAgent — auth-phase retry', () => {
    const servers: { stop: () => void }[] = [];

    afterEach(() => {
        for (const server of servers.splice(0)) {
            server.stop();
        }
    });

    it('keeps retrying an unreachable mesh instead of giving up at the first failure', async () => {
        // Nothing listens on port 1, so `fetch` throws before the mesh can answer.
        const agent = new FluxAgent('njord' as never, { domain: 'http://localhost:1' });
        const settled = { done: false };

        void agent
            .connect('NETWORK_ACCESS_CLAIM')
            .then(() => { settled.done = true; })
            .catch(() => { settled.done = true; });

        // The old behaviour settled (rejected) almost immediately. Staying pending
        // through several backoff windows is the fix.
        await new Promise((resolve) => setTimeout(resolve, 2_500));

        expect(settled.done).toBe(false);
    }, 20_000);

    it('connects once a mesh that was down starts answering', async () => {
        let authAttempts = 0;
        let accepting = false;

        const mesh = Bun.serve({
            port: 0,
            fetch: (
                request: Request,
            ) => {
                if (request.method === 'POST') {
                    authAttempts += 1;

                    if (!accepting) {
                        // The mesh is up but unwell — retryable by classification.
                        return new Response('still starting', { status: 503 });
                    }

                    return new Response('stub-ticket');
                }

                // Hold the WebSocket open-but-unfinished; this test is about the
                // auth phase only.
                return new Promise<Response>(() => undefined);
            },
        });
        servers.push({ stop: () => mesh.stop(true) });

        void new FluxAgent('njord' as never, { domain: `http://localhost:${mesh.port}` })
            .connect('NETWORK_ACCESS_CLAIM')
            .catch(() => undefined);

        // It should be hammering away at the 503 rather than having given up.
        await waitFor(() => authAttempts >= 2, 10_000);

        const attemptsWhileDown: number = authAttempts;
        accepting = true;

        // And it should get past auth on its own, with no new connect() call.
        await waitFor(() => authAttempts > attemptsWhileDown, 20_000);

        expect(authAttempts).toBeGreaterThan(attemptsWhileDown);
    }, 40_000);

    it('still fails fast on a rejected token — a bad secret is not an outage', async () => {
        const mesh = Bun.serve({
            port: 0,
            fetch: () => new Response('bad token', { status: 401 }),
        });
        servers.push({ stop: () => mesh.stop(true) });

        const error: unknown = await new FluxAgent('njord' as never, { domain: `http://localhost:${mesh.port}` })
            .connect('NETWORK_ACCESS_CLAIM')
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AuthenticationError);
    }, 20_000);

    it('still fails fast on a wrong domain', async () => {
        const mesh = Bun.serve({
            port: 0,
            fetch: () => new Response('nothing here', { status: 404 }),
        });
        servers.push({ stop: () => mesh.stop(true) });

        const error: unknown = await new FluxAgent('njord' as never, { domain: `http://localhost:${mesh.port}` })
            .connect('NETWORK_ACCESS_CLAIM')
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(EndpointNotFoundError);
    }, 20_000);
});
