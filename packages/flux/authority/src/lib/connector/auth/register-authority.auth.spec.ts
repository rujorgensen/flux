import type { TNetworkId_S } from '@flux/shared/types';
import {
    authenticateNetworkAuthorityOrThrow,
    AuthenticationError,
    ConnectionError,
    EndpointNotFoundError,
} from './register-authority.auth';
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('authenticateNetworkAuthorityOrThrow', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('should explain when the auth endpoint is missing', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            text: vi.fn().mockResolvedValue('Not found'),
        }));

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
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            text: vi.fn().mockResolvedValue('Invalid network access token'),
        }));

        await expect(authenticateNetworkAuthorityOrThrow(
            'demo-network-id' as TNetworkId_S,
            'http://localhost:5100',
            'token',
            {},
        )).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should keep transport failures retryable', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

        await expect(authenticateNetworkAuthorityOrThrow(
            'demo-network-id' as TNetworkId_S,
            'http://localhost:5100',
            'token',
            {},
        )).rejects.toBeInstanceOf(ConnectionError);
    });
});
