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

    it('should ignore acknowledgements for other channels while concurrent joins are pending', async () => {
        const manager = new ChannelStateManager();
        const subscribedCallbacks: Array<(message: string) => void> = [];
        const removedCallbacks: Array<(message: string) => void> = [];
        const sentMessages: string[] = [];
        const fluxWebSocketConnection = {
            interceptPackageTypeMessages: (
                packageType: string,
                callback: (message: string) => void,
            ) => {
                expect(packageType).toBe(SUBSCRIBED_NETWORK_CHANNEL_NAME);
                subscribedCallbacks.push(callback);
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
                sentMessages.push(message);
            },
        } as any;

        const alphaJoinPromise = manager.joinChannel(
            'alpha' as any,
            fluxWebSocketConnection,
            webSocketClient,
        );
        const betaJoinPromise = manager.joinChannel(
            'beta' as any,
            fluxWebSocketConnection,
            webSocketClient,
        );

        expect(sentMessages).toEqual([
            `${SUBSCRIBE_NETWORK_CHANNEL_NAME}:alpha`,
            `${SUBSCRIBE_NETWORK_CHANNEL_NAME}:beta`,
        ]);
        expect(subscribedCallbacks).toHaveLength(2);

        for (const subscribedCallback of subscribedCallbacks) {
            subscribedCallback('beta');
        }

        const betaChannel = await betaJoinPromise;
        expect(betaChannel).toMatchObject({
            channelName: 'beta',
        });
        expect(removedCallbacks).toHaveLength(1);

        for (const subscribedCallback of subscribedCallbacks) {
            subscribedCallback('alpha');
        }

        const alphaChannel = await alphaJoinPromise;
        expect(alphaChannel).toMatchObject({
            channelName: 'alpha',
        });
        expect(removedCallbacks).toHaveLength(2);
    });
});
