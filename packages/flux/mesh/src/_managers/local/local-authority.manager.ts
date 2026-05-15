/**
 * Disconnects a local authority client, and cleans up all related state in redis and locally.
 */
import type { TClientId } from '@flux/shared/types';
import type { TConnectedClientSocket } from '../../connected-client-socket.types';
import { PicoLogger } from '@utils/pico-logger';
import { NetworkAuthorityRedisCache } from '../../register/network-authority-redis-cache.class';

export class LocalAuthorityManager {

    constructor(
        private readonly _clientMap: Map<TClientId, TConnectedClientSocket>,
        private readonly _networkAuthorityRedisCache: NetworkAuthorityRedisCache,
    ) { }

    public kickAuthority(
        clientAddress: TClientId,
    ): void {
        const client: TConnectedClientSocket | undefined = this._clientMap
            .get(clientAddress);

        if (!client) {
            PicoLogger.warn(`We expected to find a client, but didn't. Ignoring.`, 'authority-manager');
            return;
        }

        // Let the client know
        client.close(1002, 'Kicked by process');

        // Cleanup redis
        this._networkAuthorityRedisCache
            .unregister(
                client.data.networkId,
                client.data.address,
            );

        // Cleanup local
        this._clientMap.delete(
            clientAddress,
        );
    }
}