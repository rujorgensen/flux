/**
 * Abstracting away network channel connection logic
 */
import {
    type TChannelName,
    SUBSCRIBE_NETWORK_CHANNEL_NAME,
    SUBSCRIBED_NETWORK_CHANNEL_NAME,
    UNSUBSCRIBE_NETWORK_CHANNEL_NAME,
} from "@flux/shared/types";
import { FluxNetworkChannel } from "./flux-network-channel.class";
import { FluxWebSocketClientConnection } from "@flux/shared/ws";
import { FluxWebSocketConnection } from "./flux-ws-connection";

const CONNECTION_TIMEOUT_MS = 2_000;

export class ChannelStateManager {

    private readonly connectionTimeouts: Map<TChannelName, NodeJS.Timeout> = new Map();
    private readonly joinedChannels: Map<TChannelName, { channel: FluxNetworkChannel, useCount: number; }> = new Map();

    /**
     * Join a channel.
     */
    public async joinChannel(
        channelName: TChannelName,
        fluxWebSocketConnection: FluxWebSocketConnection,
        webSocketClient: FluxWebSocketClientConnection | undefined,
    ): Promise<FluxNetworkChannel> {
        if (webSocketClient) {
            const existingChannel = this.joinedChannels.get(channelName);
            if (existingChannel) {
                existingChannel.useCount++;
                return Promise.resolve(existingChannel.channel);
            }

            return new Promise((resolve, reject) => {
                const existingTimeout = this.connectionTimeouts.get(channelName);
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                    this.connectionTimeouts.delete(channelName);
                }

                const cb = (
                    message: string,
                ) => {
                    const receivedChannelName: string = message.substring(message.indexOf(':') + 1);

                    if (channelName !== receivedChannelName) {
                        return;
                    }

                    // Cancel timeout
                    const timeout = this.connectionTimeouts.get(channelName);
                    if (timeout) {
                        clearTimeout(timeout);
                        this.connectionTimeouts.delete(channelName);
                    }

                    // Remove the interceptor
                    fluxWebSocketConnection
                        .removePackageTypeInterceptor(SUBSCRIBED_NETWORK_CHANNEL_NAME, cb);

                    const channel = new FluxNetworkChannel(channelName, fluxWebSocketConnection);
                    this.joinedChannels.set(channelName, { channel, useCount: 1 });

                    resolve(channel);
                };

                fluxWebSocketConnection
                    .interceptPackageTypeMessages(
                        SUBSCRIBED_NETWORK_CHANNEL_NAME,
                        cb,
                    );

                this.connectionTimeouts.set(
                    channelName,
                    setTimeout(() => {
                        this.connectionTimeouts.delete(channelName);
                        fluxWebSocketConnection.removePackageTypeInterceptor(SUBSCRIBED_NETWORK_CHANNEL_NAME, cb);
                        reject(new Error(`Channel subscription timed out for channel "${channelName}"`));
                    }, CONNECTION_TIMEOUT_MS),
                );

                webSocketClient.send(`${SUBSCRIBE_NETWORK_CHANNEL_NAME}:${channelName}`);
            });
        }

        return Promise.reject(new Error('Not connected'));
    }

    /**
     * Leave a channel.
     */
    public async leaveChannel(
        channelName: TChannelName,
        webSocketClient: FluxWebSocketClientConnection | undefined,
    ): Promise<void> {
        const existingChannel = this.joinedChannels.get(channelName);

        if (!existingChannel) {
            return Promise.reject(new Error('No channel instance found'));
        }

        existingChannel.useCount--;

        if (existingChannel.useCount <= 0) {
            this.joinedChannels.delete(channelName);
        }

        if (webSocketClient && (existingChannel.useCount <= 0)) {
            webSocketClient.send(`${UNSUBSCRIBE_NETWORK_CHANNEL_NAME}:${channelName}`);
        }

        if (webSocketClient) {
            // TODO wait for acknowledgment
            return Promise.resolve(void 0);
        }

        return Promise.reject(new Error('Not connected'));
    }

}