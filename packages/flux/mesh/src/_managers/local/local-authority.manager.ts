/**
 * Disconnects a local authority client, and cleans up all related state in redis and locally.
 */
import type { TClientId } from '@flux/shared/types';
import type { TConnectedClientSocket } from '../../connected-client-socket.types';
import { PicoLogger } from '@utils/pico-logger';
import { NetworkAuthorityCache } from '../../register/network-authority-cache.class';

export class LocalAuthorityManager {

    constructor(
        private readonly _clientMap: Map<TClientId, TConnectedClientSocket>,
        private readonly _networkAuthorityRedisCache: NetworkAuthorityCache,
    ) {}

    public async kickAuthority(
        clientId: TClientId,
    ): Promise<void> {
        const client: TConnectedClientSocket | undefined = this._clientMap
            .get(clientId);

        if (client) {
            // Let the client know
            client.close(1002, 'Kicked by process');

            // Cleanup local
            this._clientMap
                .delete(
                    clientId,
                );
        } else {
            PicoLogger.warn(`We expected to find a client, but didn't. Ignoring.`, 'authority-manager');
        }

        // Cleanup redis
        await this._networkAuthorityRedisCache
            .unregister(
                clientId,
                client?.data.networkId,
            );
    }
}