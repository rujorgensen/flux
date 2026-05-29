import type {
    TNetworkId_S,
    TNetworkToken_S,
} from '@flux/shared/types';
import { RedisConnection } from '@flux/mesh';
import type {
    NetworkTokenService,
} from './tokens/network-token.service';

/**
 * Local in-process cache of valid network access tokens.
 *
 * The cache is kept up-to-date via Redis pub/sub events published by the
 * portal whenever a token is created, rotated, or deleted — so the mesh
 * never needs to hit the database on the hot authentication path.
 *
 * On cold start, before any pub/sub event has been received for a given
 * network, the first validation call falls back to the persistent Redis Set
 * maintained by the portal (key: `:flux:network-tokens/{networkId}/values`),
 * populates the in-process cache, and then answers the request.
 */
export class NetworkTokenCache {
    private readonly cache: Map<TNetworkId_S, Set<TNetworkToken_S>> = new Map();


    constructor(
        private readonly _redisConnection: RedisConnection,
        private readonly _networkTokenService: NetworkTokenService,
    ) {
        this._redisConnection
            .subscribeToNetworkTokenEvents(
                (
                    networkId: TNetworkId_S,
                    tokens: TNetworkToken_S[],
                ) => {
                    this.cache.set(networkId, new Set(tokens));
                },
            );
    }

    /**
     * Returns `true` when the given plain-text token value is currently valid
     * for the specified network.
     *
     * If the network has no entry in the in-process cache (cold start), the
     * method falls back to the persistent Redis Set written by the portal and
     * populates the cache before answering.
     */
    public async isValidToken(
        networkId: TNetworkId_S,
        token: TNetworkToken_S,
    ): Promise<boolean> {
        const cached: Set<TNetworkToken_S> | undefined = this.cache.get(networkId);

        if (cached !== undefined) {
            return cached.has(token);
        }

        const tokens = await this._networkTokenService
            .readTokensByNetworkId(networkId);

        const tokenSet = new Set(tokens);

        this.cache.set(networkId, tokenSet);

        return tokenSet.has(token);
    }
}
