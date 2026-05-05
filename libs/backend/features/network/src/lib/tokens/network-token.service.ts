import type {
    TNetworkId_S,
    TNetworkToken_S,
} from '@flux/shared/types';
import {
    NetworkTokenRepository,
    NetworkTokenWithUser,
} from './network-token.repository';
import { getPortalPgRepository } from '@backend/core/prisma';
import { getMeshRedisConnection, RedisConnection } from '@flux/mesh';

let networkTokenServiceInstance: NetworkTokenService | undefined;

export const getNetworkTokenServiceInstance = (

): NetworkTokenService => {
    networkTokenServiceInstance ??= new NetworkTokenService(
        new NetworkTokenRepository(
            getPortalPgRepository(),
        ),
        getMeshRedisConnection(),
    );

    return networkTokenServiceInstance;
};

export class NetworkTokenService {

    constructor(
        private readonly _networkTokenRepository: NetworkTokenRepository,
        private readonly _redisConnection: RedisConnection,
    ) {}

    // ****************************************************************************
    // *** Create
    // ****************************************************************************

    /**
     * Creates a new token for the network.
     * Returns the full persisted record including the generated value.
     */
    public async createToken(
        networkId: TNetworkId_S,
        createdByUserId: string,
    ): Promise<NetworkTokenWithUser> {
        const token = await this._networkTokenRepository
            .createToken(
                networkId,
                createdByUserId,
            );

        this.publishAndStoreChangedTokens(
            networkId,
        );

        return token;
    }

    // ****************************************************************************
    // *** Read
    // ****************************************************************************

    /**
     * Returns all tokens for a network ordered newest-first (index 0 = primary).
     */
    public async readByNetworkId(
        networkId: TNetworkId_S,
    ): Promise<NetworkTokenWithUser[]> {
        return this._networkTokenRepository
            .readByNetworkId(
                networkId,
            );
    }

    /**
     * Returns only the plain-text values for a network's tokens.
     * Used for validation and Redis cache population.
     */
    public async readTokensByNetworkId(
        networkId: TNetworkId_S,
    ): Promise<TNetworkToken_S[]> {

        // Cold cache: fetch from the persistent Redis Set written by the portal
        const tokens: TNetworkToken_S[] = await this._redisConnection
            .getNetworkTokenValues(networkId);

        if (tokens.length > 0) {
            return tokens;
        }

        const dbTokens = await this._networkTokenRepository
            .readTokensByNetworkId(
                networkId,
            );

        // Update the global cache
        await this._redisConnection.setNetworkTokenValues(networkId, dbTokens);

        return dbTokens;

    }

    /**
     * Returns the number of tokens for a network.
     */
    public async countByNetworkId(
        networkId: TNetworkId_S,
    ): Promise<number> {
        return this._networkTokenRepository
            .countByNetworkId(
                networkId,
            );
    };

    /**
     * Finds a single token by its ID.
     */
    public async findById(
        id: string,
    ): Promise<NetworkTokenWithUser | null> {
        return this._networkTokenRepository
            .findById(
                id,
            );
    };

    // ****************************************************************************
    // *** Update
    // ****************************************************************************

    /**
     * Marks all non-primary tokens as rotated-out as of `now`,
     * leaving only the token with the given `token` untouched.
     */
    public async rotateOutAllExcept(
        networkId: TNetworkId_S,
        token: TNetworkToken_S,
        now: Date,
    ): Promise<void> {
        await this._networkTokenRepository
            .rotateOutAllExcept(
                networkId,
                token,
                now,
            );

        this.publishAndStoreChangedTokens(
            networkId,
        );
    };

    // ****************************************************************************
    // *** Delete
    // ****************************************************************************

    /**
     * Deletes a single token from a network.
     */
    public async deleteNetworkToken(
        networkId: TNetworkId_S,
        token: TNetworkToken_S,
    ): Promise<void> {
        await this._networkTokenRepository
            .deleteNetworkToken(
                networkId,
                token,
            );

        this.publishAndStoreChangedTokens(
            networkId,
        );
    };

    // ****************************************************************************
    // *** Internal Helpers
    // ****************************************************************************

    //  * Publishes internal token state change events to the mesh via Redis pub/sub
    //  * and persists the current token set in a Redis Set so that mesh processes
    //  * can bootstrap their local caches after a cold start.
    //  *
    //  * All methods are fire-and-forget: failures are logged but never re-thrown
    //  * so that token CRUD operations are not blocked by a transient Redis issue.
    //  */

    /**
     * Publishes the current set of tokens for a network.
     *
     * Fires both the Redis pub/sub event (immediate broadcast to all live
     * mesh processes) and writes the persistent Redis Set (used by the mesh
     * for cold-start bootstrapping before any pub/sub event is received).
     *
     * Call this after any mutation (create, rotate, delete).
     */
    private async publishAndStoreChangedTokens(
        networkId: TNetworkId_S,
    ): Promise<void> {
        const tokenValues = await this
            .readByNetworkId(
                networkId,
            );

        const tokens = tokenValues.map((t) => t.token as TNetworkToken_S);

        this._redisConnection
            .publishNetworkTokenEvent(networkId, tokens)
            .catch((error: unknown) =>
                console.error('Failed to publish token event to Redis:', error),
            );

        this._redisConnection
            .setNetworkTokenValues(networkId, tokens)
            .catch((error: unknown) =>
                console.error('Failed to persist token values to Redis Set:', error),
            );
    }
}
