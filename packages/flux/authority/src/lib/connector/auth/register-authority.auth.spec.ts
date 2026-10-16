import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import type { TNetworkId_S } from '@flux/shared/types';
import {
    authenticateNetworkAuthorityOrThrow,
    AuthenticationError,
    ConnectionError,
    EndpointNotFoundError,
} from './register-authority.auth';

const originalFetch: typeof globalThis.fetch = globalThis.fetch;

const stubFetchResponse = (
    status: number,
    body: string,
): void => {
    globalThis.fetch = (async (
    ): Promise<Response> => new Response(body, { status })) as unknown as typeof globalThis.fetch;
};

describe('authenticateNetworkAuthorityOrThrow', () => {
    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('should explain when the auth endpoint is missing', async () => {
        stubFetchResponse(404, 'Not found');

        await expect(authenticateNetworkAuthorityOrThrow(
            'demo-network-id' as TNetworkId_S,
            'http://localhost:3000',
            'token',
            {},
        )).rejects.toBeInstanceOf(EndpointNotFoundError);

        await expect(authenticateNetworkAuthorityOrThrow(
            'demo-network-id' as TNetworkId_S,
            'http://localhost:3000',
            'token',
            {},
        )).rejects.toThrow('Mesh server not found at http://localhost:3000.');
    });

    it('should keep invalid token failures terminal', async () => {
        stubFetchResponse(401, 'Invalid network access token');

        await expect(authenticateNetworkAuthorityOrThrow(
            'demo-network-id' as TNetworkId_S,
            'http://localhost:5100',
            'token',
            {},
        )).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should keep transport failures retryable', async () => {
        globalThis.fetch = (async (
        ): Promise<Response> => {
            throw new TypeError('fetch failed');
        }) as unknown as typeof globalThis.fetch;

        await expect(authenticateNetworkAuthorityOrThrow(
            'demo-network-id' as TNetworkId_S,
            'http://localhost:5100',
            'token',
            {},
        )).rejects.toBeInstanceOf(ConnectionError);
    });

    it('should treat a mesh that never answers as retryable, instead of hanging forever (#541)', async () => {
        // Accepts the request, never responds — what a mid-restart mesh can do.
        const server = Bun.serve({
            port: 0,
            fetch: (): Promise<Response> => new Promise<Response>(() => undefined),
        });

        // Shorten the real timeout so the test does not wait a full minute.
        const timeoutSpy = spyOn(AbortSignal, 'timeout').mockImplementation((): AbortSignal => {
            const controller: AbortController = new AbortController();
            setTimeout(() => controller.abort(new DOMException('The operation timed out.', 'TimeoutError')), 50);

            return controller.signal;
        });

        try {
            await expect(authenticateNetworkAuthorityOrThrow(
                'demo-network-id' as TNetworkId_S,
                `http://localhost:${server.port}`,
                'token',
                {},
            )).rejects.toBeInstanceOf(ConnectionError);
        } finally {
            timeoutSpy.mockRestore();
            server.stop(true);
        }
    });
});
