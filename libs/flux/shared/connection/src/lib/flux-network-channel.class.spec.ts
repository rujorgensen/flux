import { describe, expect, it, vi } from 'vitest';
import { FluxNetworkChannel } from './flux-network-channel.class';
import type { FluxWebSocketConnection } from './flux-ws-connection';

describe('FluxNetworkChannel', () => {
    it('should store the latest value when publishing', () => {
        // Mock FluxWebSocketConnection
        const mockConnection: Partial<FluxWebSocketConnection> = {
            publish: vi.fn(),
        };

        const channel = new FluxNetworkChannel('test-channel', mockConnection as FluxWebSocketConnection);

        // Test with string message
        channel.publish('test-message');
        expect(channel.getLatestValue()).toBe('test-message');
        expect(mockConnection.publish).toHaveBeenCalledWith('test-channel', 'test-message');

        // Test with object message
        const testObject = { key: 'value' };
        channel.publish(testObject);
        expect(channel.getLatestValue()).toBe(testObject);
        expect(mockConnection.publish).toHaveBeenCalledWith('test-channel', testObject);
    });

    it('should store the latest value when received through onPublish', () => {
        // Mock FluxWebSocketConnection with callback tracking
        let publishCallback: ((message: any) => void) | null = null;
        const mockConnection: Partial<FluxWebSocketConnection> = {
            onPublish: vi.fn((channelName, callback) => {
                publishCallback = callback;
            }),
        };

        const channel = new FluxNetworkChannel('test-channel', mockConnection as FluxWebSocketConnection);
        const mockHandler = vi.fn();

        // Set up the listener
        channel.onPublish(mockHandler);
        expect(mockConnection.onPublish).toHaveBeenCalled();

        // Simulate a message being received
        if (publishCallback) {
            publishCallback('received-message');
            expect(channel.getLatestValue()).toBe('received-message');
            expect(mockHandler).toHaveBeenCalledWith('received-message');

            const receivedObject = { data: 'test' };
            publishCallback(receivedObject);
            expect(channel.getLatestValue()).toBe(receivedObject);
            expect(mockHandler).toHaveBeenCalledWith(receivedObject);
        }
    });
});