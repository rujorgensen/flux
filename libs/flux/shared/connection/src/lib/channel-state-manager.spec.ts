import { describe, expect, it } from 'bun:test';
import {
    type TChannelName,
    SUBSCRIBE_NETWORK_CHANNEL_NAME,
    SUBSCRIBED_NETWORK_CHANNEL_NAME,
    UNSUBSCRIBED_NETWORK_CHANNEL_NAME,
    UNSUBSCRIBE_NETWORK_CHANNEL_NAME,
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
        };
        const webSocketClient = {
            send: (message: string) => {
                expect(message).toBe(`${SUBSCRIBE_NETWORK_CHANNEL_NAME}:general`);
                subscribedCallback?.('general');
            },
        };

        const joinedChannel = await Promise.race([
            manager.joinChannel(
                'general' as TChannelName,
                fluxWebSocketConnection as any,
                webSocketClient as any,
            ),
            new Promise<'timeout'>((resolve) => {
                setTimeout(() => resolve('timeout'), 50);
            }),
        ]);

        expect(joinedChannel).not.toBe('timeout');
        expect(joinedChannel).toMatchObject({
            _channelName: 'general',
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
        };
        const webSocketClient = {
            send: (message: string) => {
                sentMessages.push(message);
            },
        };

        const alphaJoinPromise = manager.joinChannel(
            'alpha' as TChannelName,
            fluxWebSocketConnection as any,
            webSocketClient as any,
        );
        const betaJoinPromise = manager.joinChannel(
            'beta' as TChannelName,
            fluxWebSocketConnection as any,
            webSocketClient as any,
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
            _channelName: 'beta',
        });
        expect(removedCallbacks).toHaveLength(1);

        for (const subscribedCallback of subscribedCallbacks) {
            subscribedCallback('alpha');
        }

        const alphaChannel = await alphaJoinPromise;
        expect(alphaChannel).toMatchObject({
            _channelName: 'alpha',
        });
        expect(removedCallbacks).toHaveLength(2);
    });

    it('should wait for the unsubscribe acknowledgement before resolving leaveChannel', async () => {
        const manager = new ChannelStateManager();
        let subscribedCallback: ((message: string) => void) | undefined;
        let unsubscribedCallback: ((message: string) => void) | undefined;
        const removedInterceptors: string[] = [];
        const sentMessages: string[] = [];
        const fluxWebSocketConnection = {
            interceptPackageTypeMessages: (
                packageType: string,
                callback: (message: string) => void,
            ) => {
                if (packageType === SUBSCRIBED_NETWORK_CHANNEL_NAME) {
                    subscribedCallback = callback;
                    return;
                }

                if (packageType === UNSUBSCRIBED_NETWORK_CHANNEL_NAME) {
                    unsubscribedCallback = callback;
                }
            },
            removePackageTypeInterceptor: (
                packageType: string,
                _callback: (message: string) => void,
            ) => {
                removedInterceptors.push(packageType);
            },
        };
        const webSocketClient = {
            send: (message: string) => {
                sentMessages.push(message);

                if (message === `${SUBSCRIBE_NETWORK_CHANNEL_NAME}:general`) {
                    subscribedCallback?.('general');
                }
            },
        };

        await manager.joinChannel(
            'general' as TChannelName,
            fluxWebSocketConnection as any,
            webSocketClient as any,
        );

        const leavePromise = manager.leaveChannel(
            'general' as TChannelName,
            fluxWebSocketConnection as any,
            webSocketClient as any,
        );
        const leaveResultBeforeAck = await Promise.race([
            leavePromise.then(() => 'resolved'),
            new Promise<'timeout'>((resolve) => {
                setTimeout(() => resolve('timeout'), 50);
            }),
        ]);

        expect(sentMessages).toEqual([
            `${SUBSCRIBE_NETWORK_CHANNEL_NAME}:general`,
            `${UNSUBSCRIBE_NETWORK_CHANNEL_NAME}:general`,
        ]);

        expect(leaveResultBeforeAck).toBe('timeout');

        unsubscribedCallback?.(`${UNSUBSCRIBED_NETWORK_CHANNEL_NAME}:general`);

        expect(leavePromise).resolves.toBeUndefined();

        expect(removedInterceptors).toContain(UNSUBSCRIBED_NETWORK_CHANNEL_NAME);
    });
});
