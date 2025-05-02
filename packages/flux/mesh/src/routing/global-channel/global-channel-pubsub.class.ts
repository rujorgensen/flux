/**
 * 1. Detects global events and publishes them to all clients subscribed to the websocket channel system.
 * 
 * 2.   Sends messages to all nodes in the cluster, and when reached, publishes locally 
 *      on the server channel to everyone subscribed.
 */

import type { TProcessAddress } from '@flux/shared/types';
import type { TConnectedClientSocket } from '../../main';
import type { RedisConnection } from '../redis/redis-connection.class';

export type TGlobalChannel = string & { __brand: 'global-channel'; };

export class GlobalChannelPubsub {
    constructor(
        private readonly redisConnection: RedisConnection,
        private readonly bunServer: Bun.Server,
        private readonly processAddress: TProcessAddress,
    ) {
        this.subscribeWebsocketChannelEvent();
    }

    /**
     * Subscribes to the websocket channel event and publishes it on the local process.
     * 
     * @returns { void }
     */
    private subscribeWebsocketChannelEvent(
    ): void {
        this.redisConnection
            .subscribeWebsocketChannelEvent((
                channel: TGlobalChannel,
                skipProcessAddress: TProcessAddress,
                message: string,
            ): void => {
                if (this.processAddress === skipProcessAddress) {
                    return;
                }

                // Publish it on the local process
                this.bunServer.publish(
                    message,
                    channel,
                );
            });
    }

    public publish(
        ws: TConnectedClientSocket,
        channel: string,
        message: string,
    ): void {
        // Publish locally on the process to everyone but the client
        ws.publish(
            channel,
            message,
        );

        // Publish globally to clients connected to other processes
        this.redisConnection.publishWebsocketChannelEvent(
            this.processAddress, // The event is already sent to the local process
            channel as TGlobalChannel,
            message,
        );
    }
}