import type { INetworkChannelState, TChannelName, TNetworkId_S } from "@flux/shared/types";
import type { RedisConnection } from '@flux/mesh';

/**
 * Emitting events on the Redis client.
 */
export class NetworkChannelRedisEvents {

    constructor(
        private readonly _redisConnection: RedisConnection,
    ) {}

    // ****************************************************************************
    // * Advertise Events
    // ****************************************************************************
    public advertiseChannelCreate(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<number> {
        return this._redisConnection
            .publishGlobal(
                networkId,
                `channel-created`,
                channelName,
            );
    }

    public advertiseChannelUsage(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        usageBytes: number,
    ): Promise<number> {
        return this._redisConnection
            .publishGlobal(
                networkId,
                `channel-usage`,
                JSON.stringify({ channelName, usageBytes }),
            );
    }

    public advertiseChannelStateChange(
        networkId: TNetworkId_S,
        channelState: INetworkChannelState,
    ): Promise<number> {
        return this._redisConnection
            .publishGlobal(
                networkId,
                `channel-updated`,
                JSON.stringify(channelState),
            );
    }

    public advertiseChannelDelete(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<number> {
        return this._redisConnection
            .publishGlobal(
                networkId,
                `channel-deleted`,
                channelName,
            );
    }

    // ****************************************************************************
    // * Listen to Events
    // ****************************************************************************
    public onChannelCreate(
        networkId: TNetworkId_S,
        callback: (
            channelName: TChannelName,
        ) => void,
    ): Promise<void> {
        return this._redisConnection
            .subscribeGlobal(
                networkId,
                `channel-created`,
                (message) => {
                    callback(message as TChannelName);
                },
            );
    }

    public onChannelUsage(
        networkId: TNetworkId_S,
        callback: (
            channelName: TChannelName,
            usageBytes: number,
        ) => void,
    ): Promise<void> {
        return this._redisConnection
            .subscribeGlobal(
                networkId,
                `channel-usage`,
                (message) => {
                    try {
                        const parsed = JSON.parse(message) as { channelName: TChannelName; usageBytes: number; };
                        callback(parsed.channelName, parsed.usageBytes);
                    } catch (error) {
                        console.error('Failed to parse channel usage message:', error);
                    }
                },
            );
    }

    public onChannelStateChange(
        networkId: TNetworkId_S,
        callback: (
            channelState: INetworkChannelState,
        ) => void,
    ): Promise<void> {
        return this._redisConnection
            .subscribeGlobal(
                networkId,
                `channel-updated`,
                (message) => {
                    try {
                        const channelState = JSON.parse(message) as INetworkChannelState;
                        callback(channelState);
                    } catch (error) {
                        console.error('Failed to parse channel state change message:', error);
                    }
                },
            );
    }

    public onChannelDelete(
        networkId: TNetworkId_S,
        callback: (
            channelName: TChannelName,
        ) => void,
    ): Promise<void> {
        return this._redisConnection
            .subscribeGlobal(
                networkId,
                `channel-deleted`,
                (message) => {
                    callback(message as TChannelName);
                },
            );
    }
}
