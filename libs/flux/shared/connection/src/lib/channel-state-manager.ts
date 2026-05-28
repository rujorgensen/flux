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

    /**
     * Join a channel.
     */
    public async joinChannel(
        channelName: TChannelName,
        fluxWebSocketConnection: FluxWebSocketConnection,
        webSocketClient: FluxWebSocketClientConnection | undefined,
    ): Promise<FluxNetworkChannel> {
        if (webSocketClient) {
            return new Promise((resolve, reject) => {
                webSocketClient.send(`${SUBSCRIBE_NETWORK_CHANNEL_NAME}:${channelName}`);

                const existingTimeout = this.connectionTimeouts.get(channelName);
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                    this.connectionTimeouts.delete(channelName);
                }

                const cb = (
                    message: string,
                ) => {
                    // Cancel timeout
                    const timeout = this.connectionTimeouts.get(channelName);
                    if (timeout) {
                        clearTimeout(timeout);
                        this.connectionTimeouts.delete(channelName);
                    }

                    // Remove the interceptor
                    fluxWebSocketConnection
                        .removePackageTypeInterceptor(SUBSCRIBED_NETWORK_CHANNEL_NAME, cb);

                    const receivedChannelName: TChannelName = message.substring(message.indexOf(':') + 1) as TChannelName;

                    if (channelName !== receivedChannelName) {
                        reject(new Error(`Channel name mismatch: "${channelName}" !== "${receivedChannelName}"`));
                        return;
                    }

                    resolve(new FluxNetworkChannel(channelName, fluxWebSocketConnection));
                };

                this.connectionTimeouts.set(
                    channelName,
                    setTimeout(() => {
                        this.connectionTimeouts.delete(channelName);
                        fluxWebSocketConnection.removePackageTypeInterceptor(SUBSCRIBED_NETWORK_CHANNEL_NAME, cb);
                        reject(new Error(`Channel subscription timed out for channel "${channelName}"`));
                    }, CONNECTION_TIMEOUT_MS),
                );

                fluxWebSocketConnection
                    .interceptPackageTypeMessages(
                        SUBSCRIBED_NETWORK_CHANNEL_NAME,
                        cb,
                    );
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

        if (webSocketClient) {
            webSocketClient.send(`${UNSUBSCRIBE_NETWORK_CHANNEL_NAME}:${channelName}`);

            // TODO wait for acknowledgment
            return Promise.resolve(void 0);
        }

        return Promise.reject(new Error('Not connected'));
    }

}