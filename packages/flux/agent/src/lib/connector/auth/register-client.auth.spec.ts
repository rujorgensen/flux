import { afterEach, describe, expect, it } from 'bun:test';
import {
    AuthenticationError,
    ConnectionError,
    EndpointNotFoundError,
    RetryableError,
} from '@flux/shared/utils';
import { NetworkAuthorityNotFoundError } from '@flux/shared/types';
import { authenticateAgentOrThrow } from './register-client.auth';

/**
 * The Agent used to throw a bare `Error` for every auth failure, so its caller
 * could not tell "the mesh is down" from "your token is wrong" — and therefore
 * retried neither. These assert the classification that makes the retry policy
 * in flux-agent.class.ts possible.
 */

const authenticate = (
    domain: string,
): Promise<string> =>
    authenticateAgentOrThrow(
        'njord' as never,
        domain,
        { some: 'identification' },
        {},
    );

const startMesh = (
    respond: () => Response,
): { url: string; stop: () => void } => {
    const server = Bun.serve({
        port: 0,
        fetch: () => respond(),
    });

    return {
        url: `http://localhost:${server.port}`,
        stop: () => server.stop(true),
    };
};

describe('authenticateAgentOrThrow — failure classification', () => {
    const servers: { stop: () => void }[] = [];

    afterEach(() => {
        for (const server of servers.splice(0)) {
            server.stop();
        }
    });

    it('treats an unreachable mesh as retryable', async () => {
        // Nothing is listening: `fetch` throws before the mesh can answer.
        const error: unknown = await authenticate('http://localhost:1').catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ConnectionError);
        expect(error).toBeInstanceOf(RetryableError);
    });

    it('treats 5xx and 429 as retryable — the mesh may recover', async () => {
        for (const status of [500, 503, 429]) {
            const mesh = startMesh(() => new Response('nope', { status }));
            servers.push(mesh);

            const error: unknown = await authenticate(mesh.url).catch((e: unknown) => e);

            expect(error).toBeInstanceOf(RetryableError);
            expect((error as ConnectionError).statusCode).toBe(status);
        }
    });

    it('does NOT retry a rejected token — retrying cannot fix it', async () => {
        const mesh = startMesh(() => new Response('bad token', { status: 401 }));
        servers.push(mesh);

        const error: unknown = await authenticate(mesh.url).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error).not.toBeInstanceOf(RetryableError);
    });

    it('does NOT retry a wrong domain — a config error must be loud, not silent', async () => {
        const mesh = startMesh(() => new Response('nothing here', { status: 404 }));
        servers.push(mesh);

        const error: unknown = await authenticate(mesh.url).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(EndpointNotFoundError);
        expect(error).not.toBeInstanceOf(RetryableError);
    });

    it('still surfaces a missing Authority as its own error', async () => {
        // The Agent retries this under a separate, shorter policy.
        const mesh = startMesh(() => new Response(NetworkAuthorityNotFoundError.message, { status: 401 }));
        servers.push(mesh);

        const error: unknown = await authenticate(mesh.url).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(NetworkAuthorityNotFoundError);
        expect(error).not.toBeInstanceOf(RetryableError);
    });

    it('does not retry other 4xx — the mesh answered, and the answer was "no"', async () => {
        const mesh = startMesh(() => new Response('malformed request', { status: 400 }));
        servers.push(mesh);

        const error: unknown = await authenticate(mesh.url).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(RetryableError);
    });
});
