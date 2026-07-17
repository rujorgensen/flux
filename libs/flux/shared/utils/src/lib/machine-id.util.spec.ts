import { afterEach, describe, expect, it } from 'bun:test';
import { getMachineUID } from './machine-id.util';

describe('getMachineUID (#488 related fix)', () => {
    afterEach(() => {
        globalThis.__flux_client_id = null;
    });

    it('returns null — not undefined — when no id has ever been set', async () => {
        // Simulate a fresh process: the global has never been assigned.
        // oxlint-disable-next-line typescript/no-explicit-any
        delete (globalThis as any).__flux_client_id;

        await expect(getMachineUID()).resolves.toBeNull();
    });

    it('returns null when the id was explicitly cleared', async () => {
        globalThis.__flux_client_id = null;

        await expect(getMachineUID()).resolves.toBeNull();
    });

    it('reuses an existing id', async () => {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        globalThis.__flux_client_id = 'machine-abc-123' as typeof globalThis.__flux_client_id;

        await expect(getMachineUID()).resolves.toBe(
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            'machine-abc-123' as NonNullable<typeof globalThis.__flux_client_id>,
        );
    });
});
