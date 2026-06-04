/**
 * Emitting events on the Redis client.
 */
import type { TClientId, TNetworkId_S } from '@flux/shared/types';
import type { RedisConnection } from '@flux/mesh';

export class NetworkAuthorityRedisEvents {

    constructor(
        private readonly _redisConnection: RedisConnection,
    ) {}

    // ****************************************************************************
    // * Advertise Events
    // ****************************************************************************
    public advertiseAuthorityCountChange(
        networkId: TNetworkId_S,
        authorityCount: number,
    ): Promise<number> {
        return this._redisConnection
            .publishGlobal(
                networkId,
                `authority-count-change`,
                `${authorityCount}`,
            );
    }

    public advertiseAuthorityCreated(
        networkId: TNetworkId_S,
        clientId: TClientId,
    ): Promise<number> {
        return this._redisConnection
            .publishGlobal(
                networkId,
                `authority-created`,
                clientId,
            );
    }

    public advertiseAuthorityDeleted(
        networkId: TNetworkId_S,
        clientId: TClientId,
    ): Promise<number> {
        return this._redisConnection
            .publishGlobal(
                networkId,
                `authority-deleted`,
                clientId,
            );
    }

    // ****************************************************************************
    // * Listen to Events
    // ****************************************************************************
    public onAuthorityCountChange(
        networkId: TNetworkId_S,
        callback: (
            authorityCount: number,
        ) => void,
    ): Promise<void> {
        return this._redisConnection
            .subscribeGlobal(
                networkId,
                `authority-count-change`,
                (message) => {
                    const authorityCount = Number.parseInt(message);
                    if (!Number.isNaN(authorityCount)) {
                        callback(authorityCount);
                    }
                },
            );
    }

    public onAuthorityCreated(
        networkId: TNetworkId_S,
        callback: (
            clientId: TClientId,
        ) => void,
    ): Promise<void> {
        return this._redisConnection
            .subscribeGlobal(
                networkId,
                `authority-created`,
                (message) => {
                    callback(message as TClientId);
                },
            );
    }

    public onAuthorityDeleted(
        networkId: TNetworkId_S,
        callback: (
            clientId: TClientId,
        ) => void,
    ): Promise<void> {
        return this._redisConnection
            .subscribeGlobal(
                networkId,
                `authority-deleted`,
                (message) => {
                    callback(message as TClientId);
                },
            );
    }
}
