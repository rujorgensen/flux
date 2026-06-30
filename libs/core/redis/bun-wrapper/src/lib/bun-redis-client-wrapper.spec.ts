import { RedisClient } from 'bun';
import {
    type StartedRedisContainer,
    RedisContainer,
} from '@testcontainers/redis';
import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
} from 'bun:test';
import { BunRedisClient } from './bun-redis-client-wrapper';

/**
 * These tests guard the removal of the Bun 1.2.16 re-instantiation workaround in
 * {@link BunRedisClient}. The wrapper now reuses a single RedisClient instance
 * across reconnects instead of allocating a new one. That relies on two Bun
 * behaviours which, if they regress, would silently break reconnection (or
 * resurrect the orphaned-client async-crash). Each behaviour is asserted below.
 */

/**
 * Polls an async command until it resolves (rather than rejecting because Redis
 * is mid-reconnect), returning its value. Throws if it never succeeds in time.
 */
const eventually = async <T,>(
    command: () => Promise<T>,
    timeoutMilliseconds = 30_000,
): Promise<T> => {
    const start = Date.now();
    // oxlint-disable-next-line typescript/no-unnecessary-condition
    while (true) {
        try {
            return await command();
        } catch (error) {
            if (Date.now() - start > timeoutMilliseconds) {
                throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
    }
};

describe('Bun RedisClient — same-instance reconnect capability', () => {
    // The workaround existed because Bun 1.2.16 could not reconnect a closed
    // instance via client.connect(). If this fails, restore the re-instantiation.
    it('reconnects the same instance via connect() after close()', async () => {
        const url: string = globalThis['infrastructureRedisURL'];
        const client = new RedisClient(url, { autoReconnect: false, idleTimeout: 0 });

        await client.connect();
        await client.set('reuse-key', 'before');
        expect(await client.get('reuse-key')).toBe('before');

        client.close();
        expect(client.connected).toBe(false);
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Same instance, reconnected — no new RedisClient allocated.
        await client.connect();
        expect(client.connected).toBe(true);
        expect(await client.get('reuse-key')).toBe('before');

        client.close();
    });
});

describe('BunRedisClient wrapper — reconnect after a connection drop', () => {
    let container: StartedRedisContainer;
    let url: string;
    let wrapper: BunRedisClient;

    beforeAll(async () => {
        // Dedicated container so dropping the connection does not disturb the
        // shared infrastructure container used by the rest of the suite.
        container = await new RedisContainer('redis:8.6.0').start();
        url = container.getConnectionUrl();
    }, 60_000);

    afterAll(async () => {
        wrapper.disconnect();
        await container.stop();
    });

    it('reuses the same underlying client instance across a connection drop', async () => {
        wrapper = new BunRedisClient({
            url,
            socket: { reconnectStrategy: () => 200 },
        });

        let reconnected = false;
        wrapper.on('reconnecting', () => { reconnected = true; });

        await wrapper.connect();
        const clientBefore = wrapper.client;
        await clientBefore.set('drop-key', 'survived');
        expect(await clientBefore.get('drop-key')).toBe('survived');

        // Transient connection drop: close the socket while the server stays up at
        // the same address — the production case (a Redis blip / failover). A full
        // container restart is unusable here: testcontainers remaps the published
        // port, and a real Redis process restart wipes the in-memory 'drop-key'.
        wrapper.client.close();

        // The wrapper must transparently recover: a command issued after the
        // drop eventually succeeds once it has reconnected.
        const value = await eventually(() => wrapper.client.get('drop-key'));
        expect(value).toBe('survived');

        // It detected the drop and reconnected the SAME underlying instance
        // rather than allocating a new one.
        expect(reconnected).toBe(true);
        expect(wrapper.client).toBe(clientBefore);
    }, 60_000);
});
