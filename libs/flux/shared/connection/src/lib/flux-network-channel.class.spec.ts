import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FluxNetworkChannel } from './flux-network-channel.class';
import type { FluxWebSocketConnection } from './flux-ws-connection';
import { BunRedisClient } from '@core/redis/bun';

// Mock Redis implementation
vi.mock('@flux/mesh/core/redis', () => ({
    getMeshBunRedisConnection: vi.fn().mockImplementation(() => Promise.resolve({
        connected: true,
        getClient: vi.fn().mockReturnValue({
            get: vi.fn().mockImplementation(async (key) => {
                // Return stored value or null
                return redisStore[key] || null;
            }),
            set: vi.fn().mockImplementation(async (key, value) => {
                // Store the value
                redisStore[key] = value;
                return 'OK';
            })
        })
    }))
}));

// Mock Redis store
const redisStore: Record<string, string> = {};

describe('FluxNetworkChannel', () => {
    beforeEach(() => {
        // Clear the Redis store before each test
        Object.keys(redisStore).forEach(key => delete redisStore[key]);
    });

    it('should store the latest value in Redis when publishing', async () => {
        // Mock FluxWebSocketConnection
        const mockConnection: Partial<FluxWebSocketConnection> = {
            publish: vi.fn(),
        };

        const channel = new FluxNetworkChannel('test-channel', mockConnection as FluxWebSocketConnection);

        // Test with string message
        channel.publish('test-message');
        expect(mockConnection.publish).toHaveBeenCalledWith('test-channel', 'test-message');

        // Wait a bit for async Redis operations to complete
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Check the value was stored and can be retrieved
        const latestString = await channel.getLatestValue<string>();
        expect(latestString).toBe('test-message');

        // Test with object message
        const testObject = { key: 'value' };
        channel.publish(testObject);
        expect(mockConnection.publish).toHaveBeenCalledWith('test-channel', testObject);
        
        // Wait a bit for async Redis operations to complete
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Check the value was stored and can be retrieved
        const latestObject = await channel.getLatestValue<typeof testObject>();
        expect(latestObject).toEqual(testObject);
    });

    it('should store the latest value in Redis when received through onPublish', async () => {
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
            expect(mockHandler).toHaveBeenCalledWith('received-message');
            
            // Wait a bit for async Redis operations to complete
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Check the value was stored and can be retrieved
            const latestString = await channel.getLatestValue<string>();
            expect(latestString).toBe('received-message');

            const receivedObject = { data: 'test' };
            publishCallback(receivedObject);
            expect(mockHandler).toHaveBeenCalledWith(receivedObject);
            
            // Wait a bit for async Redis operations to complete
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Check the value was stored and can be retrieved
            const latestObject = await channel.getLatestValue<typeof receivedObject>();
            expect(latestObject).toEqual(receivedObject);
        }
    });

    it('should warn when using the deprecated synchronous getLatestValue method', () => {
        // Mock console.warn
        const originalWarn = console.warn;
        console.warn = vi.fn();

        const mockConnection: Partial<FluxWebSocketConnection> = {
            publish: vi.fn(),
        };

        const channel = new FluxNetworkChannel('test-channel', mockConnection as FluxWebSocketConnection);
        
        // Use the deprecated synchronous method
        const value = (channel.getLatestValue as any)();
        expect(value).toBeUndefined();
        expect(console.warn).toHaveBeenCalled();

        // Restore console.warn
        console.warn = originalWarn;
    });
});