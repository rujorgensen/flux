import { getMeshRedisConnection, GlobalClientManager } from '@flux/mesh';
import type { TAddress } from '@flux/shared/types';

/**
 * Publishes a kick message to the mesh process that owns the given socket so
 * it is closed. Delegates to `GlobalClientManager.kickClient()` which
 * resolves the correct Redis channel from the address.
 *
 * @param { TAddress } address - Full client address (`{machineAddress}/{processId}/{clientId}`)
 *
 * @returns { Promise<void> }
 */
export async function kickSocket(
    address: TAddress,
): Promise<void> {
    const connection = getMeshRedisConnection();
    const manager = new GlobalClientManager(connection);

    await manager.kickClient(address);
}
