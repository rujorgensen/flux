/**
 * Disconnects a local agent client, and cleans up all related state in redis and locally.
 */
import type { TClientId } from '@flux/shared/types';
import { TConnectedClientSocket } from '../../connected-client-socket.types';
import { PicoLogger } from '@utils/pico-logger';
import { NetworkAgentService } from '../../register/network-agent.service';

export class LocalAgentManager {

    constructor(
        private readonly _clientMap: Map<TClientId, TConnectedClientSocket>,
        private readonly _networkAgentService: NetworkAgentService,
    ) {}

    public async kickAgent(
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
            PicoLogger.error(`We expected to find a client, but didn't. Ignoring.`, 'agent-manager');
        }

        // Cleanup redis
        await this._networkAgentService
            .unregister(
                clientId,
                client?.data.address,
                client?.data.networkId,
            );
    }
}