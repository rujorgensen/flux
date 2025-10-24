/**
 * 1. Detects global events and publishes them to all clients subscribed to the websocket channel system.
 * 
 * 2.   Sends messages to all nodes in the cluster, and when reached, publishes locally 
 *      on the server channel to everyone subscribed.
 */

import type { TProcessAddress } from '@flux/shared/types';
import type { TConnectedClientSocket } from '../../connected-client-socket.types';
import type { RedisConnection } from '../redis/redis-connection.class';

export type TGlobalChannel = string & { __brand: 'global-channel'; };

type TWebsocketData = {};
export class GlobalChannelPubsub {

    constructor(
        private readonly redisConnection: RedisConnection,
        private readonly bunServer: Bun.Server<TWebsocketData>,
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

    /**
     * Publishes a message to the given channel.
     * 
     * @param { string }  channel
     * @param { string }  message
     * @param { TConnectedClientSocket }  [ws]
     * 
     * @returns { Promise<void> }
     */
    public async publish(
        channel: string,
        message: string,
        ws?: TConnectedClientSocket,
    ): Promise<void> {
        // Publish locally on the process to everyone but the client (if a client is provided)
        (ws ?? this.bunServer).publish(
            channel,
            message,
        );

        // Publish globally to clients connected to other processes
        await this.redisConnection.publishWebsocketChannelEvent(
            this.processAddress, // The event is already sent to the local process
            channel as TGlobalChannel,
            message,
        );
    }
}