import { afterEach, describe, expect, it } from 'bun:test';
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
});
