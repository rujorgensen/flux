import {
    type TAddress,
    type TClientId,
    type TProcessId,
    type TNetworkId_S,
    type TMachineAddress,
    splitAddressOrThrow,
} from '@flux/shared/types';
import { RedisConnection } from '../routing/redis/redis-connection.class';
import { GlobalClientManager } from './global/global-client.manager';
import { LocalAgentManager } from './local/local-agent.manager';
import { readMachineAddress, readProcessId } from '../routing/addressing.utils';
import { TConnectedClientSocket } from '../connected-client-socket.types';
import { NetworkAgentRedisCache } from '../register/network-agent-redis-cache.class';

export class AgentManager {
    private readonly machineAddress: TMachineAddress = readMachineAddress();
    private readonly processAddress: TProcessId = readProcessId();

    private readonly _globalClientManager: GlobalClientManager;
    private readonly _localAgentManager: LocalAgentManager;

    constructor(
        private readonly _redisConnection: RedisConnection,
        private readonly _clientMap: Map<TClientId, TConnectedClientSocket>,
        private readonly _networkAgentRedisCache: NetworkAgentRedisCache,
    ) {
        this._globalClientManager = new GlobalClientManager(this._redisConnection);
        this._localAgentManager = new LocalAgentManager(
            this._clientMap,
            this._networkAgentRedisCache,
        );

        // Subscribe to global events
        this._globalClientManager
            .onKickClient(
                'agent',
                this._localAgentManager.kickAgent.bind(this._localAgentManager),
            );
    }

    public kick(
        agentAddress: TAddress,
    ): void {
        const [machineAddress, processId, clientId] = splitAddressOrThrow(agentAddress);

        // * Not on the same machine
        if (machineAddress !== this.machineAddress) {
            void this._globalClientManager
                .kickClient(
                    'agent',
                    agentAddress,
                );
            return;
        }

        // * Not on the same process
        if (processId !== this.processAddress) {
            // ! Route through Redis for now, but change to direct process connection
            void this._globalClientManager
                .kickClient(
                    'agent',
                    agentAddress,
                );
            return;
        }

        // * This must be to local process
        void this._localAgentManager
            .kickAgent(clientId);
    }
}