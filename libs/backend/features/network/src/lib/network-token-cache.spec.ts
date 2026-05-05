import { describe, it, expect } from 'bun:test';
import { NetworkTokenCache } from './network-token-cache.class';
import { RedisConnection } from '@flux/mesh';
import { NetworkTokenService } from './tokens/network-token.service';
import { NetworkTokenRepository } from './tokens/network-token.repository';

// ****************************************************************************
// *** Helpers
// ****************************************************************************

type TokenEventCallback = (networkId: string, tokens: string[]) => void;

/**
 * Creates a minimal stub of {@link RedisConnection} that captures the
 * token-event subscription callback so tests can fire events directly and
 * also provides a controllable `getNetworkTokenValues` fallback.
 */
function makeRedisStub(
    initialRedisValues: Record<string, string[]> = {},
): {
    redisStub: Pick<RedisConnection, 'subscribeToNetworkTokenEvents' | 'getNetworkTokenValues'>;
    emit: TokenEventCallback;
    redisValues: Record<string, string[]>;
} {
    let captured: TokenEventCallback | undefined;
    const redisValues = { ...initialRedisValues };

    const redisStub = {
        subscribeToNetworkTokenEvents(
            callback: TokenEventCallback,
        ): void {
            captured = callback;
        },
        async getNetworkTokenValues(
            networkId: string,
        ): Promise<string[]> {
            return redisValues[networkId] ?? [];
        },
    };

    return {
        redisStub,
        emit: (networkId, tokens) => captured?.(networkId, tokens),
        redisValues,
    };
}

// ****************************************************************************
// *** Tests
// ****************************************************************************

describe('NetworkTokenCache', () => {
    it('returns false for an unknown network with no Redis fallback values', async () => {
        const { redisStub } = makeRedisStub();
        const networkTokenService: NetworkTokenService = new NetworkTokenService(
            null as unknown as NetworkTokenRepository,
            redisStub as RedisConnection,
        );
        const cache = new NetworkTokenCache(
            redisStub as unknown as RedisConnection,
            networkTokenService,
        );

        expect(await cache.isValidToken('net-1', 'flx_some-token')).toBe(false);
    });

    it('returns true after a token-created event is received', async () => {
        const { redisStub, emit } = makeRedisStub();
        const networkTokenService: NetworkTokenService = new NetworkTokenService(
            null as unknown as NetworkTokenRepository,
            redisStub as RedisConnection,
        );
        const cache = new NetworkTokenCache(
            redisStub as unknown as RedisConnection,
            networkTokenService,
        );

        emit('net-1', ['flx_token-a', 'flx_token-b']);

        expect(await cache.isValidToken('net-1', 'flx_token-a')).toBe(true);
        expect(await cache.isValidToken('net-1', 'flx_token-b')).toBe(true);
    });

    it('returns false for a token not included in the event payload', async () => {
        const { redisStub, emit } = makeRedisStub();
        const networkTokenService: NetworkTokenService = new NetworkTokenService(
            null as unknown as NetworkTokenRepository,
            redisStub as RedisConnection,
        );
        const cache = new NetworkTokenCache(
            redisStub as unknown as RedisConnection,
            networkTokenService,
        );

        emit('net-1', ['flx_token-a']);

        expect(await cache.isValidToken('net-1', 'flx_token-b')).toBe(false);
    });

    it('invalidates a token after a rotation event replaces it', async () => {
        const { redisStub, emit } = makeRedisStub();
        const networkTokenService: NetworkTokenService = new NetworkTokenService(
            null as unknown as NetworkTokenRepository,
            redisStub as RedisConnection,
        );
        const cache = new NetworkTokenCache(
            redisStub as unknown as RedisConnection,
            networkTokenService,
        );

        // Initial set
        emit('net-1', ['flx_old-token']);
        expect(await cache.isValidToken('net-1', 'flx_old-token')).toBe(true);

        // Rotation: old token is no longer present
        emit('net-1', ['flx_new-token', 'flx_old-token']);
        expect(await cache.isValidToken('net-1', 'flx_new-token')).toBe(true);

        // Deletion of old token
        emit('net-1', ['flx_new-token']);
        expect(await cache.isValidToken('net-1', 'flx_old-token')).toBe(false);
        expect(await cache.isValidToken('net-1', 'flx_new-token')).toBe(true);
    });

    it('tracks tokens independently per network', async () => {
        const { redisStub, emit } = makeRedisStub();
        const networkTokenService: NetworkTokenService = new NetworkTokenService(
            null as unknown as NetworkTokenRepository,
            redisStub as RedisConnection,
        );
        const cache = new NetworkTokenCache(
            redisStub as unknown as RedisConnection,
            networkTokenService,
        );

        emit('net-1', ['flx_token-a']);
        emit('net-2', ['flx_token-b']);

        expect(await cache.isValidToken('net-1', 'flx_token-a')).toBe(true);
        expect(await cache.isValidToken('net-1', 'flx_token-b')).toBe(false);
        expect(await cache.isValidToken('net-2', 'flx_token-b')).toBe(true);
        expect(await cache.isValidToken('net-2', 'flx_token-a')).toBe(false);
    });

    it('treats an empty token list as no valid tokens', async () => {
        const { redisStub, emit } = makeRedisStub();
        const networkTokenService: NetworkTokenService = new NetworkTokenService(
            null as unknown as NetworkTokenRepository,
            redisStub as RedisConnection,
        );
        const cache = new NetworkTokenCache(
            redisStub as unknown as RedisConnection,
            networkTokenService,
        );

        emit('net-1', ['flx_token-a']);
        emit('net-1', []);

        expect(await cache.isValidToken('net-1', 'flx_token-a')).toBe(false);
    });

    it('falls back to Redis on cold cache and returns true for a valid token', async () => {
        const { redisStub } = makeRedisStub({
            'net-cold': ['flx_redis-token'],
        });
        const networkTokenService: NetworkTokenService = new NetworkTokenService(
            null as unknown as NetworkTokenRepository,
            redisStub as RedisConnection,
        );
        const cache = new NetworkTokenCache(
            redisStub as unknown as RedisConnection,
            networkTokenService,
        );

        // No pub/sub event received — cache is cold for 'net-cold'
        expect(await cache.isValidToken('net-cold', 'flx_redis-token')).toBe(true);
    });

    it('falls back to Redis on cold cache and returns false for an invalid token', async () => {
        const { redisStub } = makeRedisStub({
            'net-cold': ['flx_redis-token'],
        });
        const networkTokenService: NetworkTokenService = new NetworkTokenService(
            null as unknown as NetworkTokenRepository,
            redisStub as RedisConnection,
        );
        const cache = new NetworkTokenCache(
            redisStub as unknown as RedisConnection,
            networkTokenService,
        );

        expect(await cache.isValidToken('net-cold', 'flx_wrong-token')).toBe(false);
    });

    it('uses in-process cache on subsequent calls after cold-start fallback', async () => {
        let redisCalls = 0;

        const redisStub = {
            subscribeToNetworkTokenEvents(
                _callback: TokenEventCallback,
            ): void {},
            async getNetworkTokenValues(
                _networkId: string,
            ): Promise<string[]> {
                redisCalls += 1;
                return ['flx_redis-token'];
            },
        };

        const networkTokenService: NetworkTokenService = new NetworkTokenService(
            null as unknown as NetworkTokenRepository,
            redisStub as RedisConnection,
        );
        const cache = new NetworkTokenCache(
            redisStub as unknown as RedisConnection,
            networkTokenService,
        );

        // First call triggers Redis fallback
        await cache.isValidToken('net-1', 'flx_redis-token');
        // Second call should use the in-process cache
        await cache.isValidToken('net-1', 'flx_redis-token');

        expect(redisCalls).toBe(1);
    });
});

