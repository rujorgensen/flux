import { describe, expect, it } from 'bun:test';
import {
    SUBSCRIBE_NETWORK_CHANNEL_NAME,
    SUBSCRIBED_NETWORK_CHANNEL_NAME,
} from '@flux/shared/types';
import { ChannelStateManager } from './channel-state-manager';

describe('ChannelStateManager', () => {
    it('should resolve channel joins when the server acknowledges immediately', async () => {
        const manager = new ChannelStateManager();
        let subscribedCallback: ((message: string) => void) | undefined;
        const removedCallbacks: Array<(message: string) => void> = [];
        const fluxWebSocketConnection = {
            interceptPackageTypeMessages: (
                packageType: string,
                callback: (message: string) => void,
            ) => {
                expect(packageType).toBe(SUBSCRIBED_NETWORK_CHANNEL_NAME);
                subscribedCallback = callback;
            },
            removePackageTypeInterceptor: (
                packageType: string,
                callback: (message: string) => void,
            ) => {
                expect(packageType).toBe(SUBSCRIBED_NETWORK_CHANNEL_NAME);
                removedCallbacks.push(callback);
            },
        } as any;
        const webSocketClient = {
            send: (message: string) => {
                expect(message).toBe(`${SUBSCRIBE_NETWORK_CHANNEL_NAME}:general`);
                subscribedCallback?.('general');
            },
        } as any;

        const joinedChannel = await Promise.race([
            manager.joinChannel(
                'general' as any,
                fluxWebSocketConnection,
                webSocketClient,
            ),
            new Promise<'timeout'>((resolve) => {
                setTimeout(() => resolve('timeout'), 50);
            }),
        ]);

        expect(joinedChannel).not.toBe('timeout');
        expect(joinedChannel).toMatchObject({
            channelName: 'general',
        });
        expect(removedCallbacks).toHaveLength(1);
    });
});
