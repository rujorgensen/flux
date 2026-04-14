import {
    type TAddress,
    TClientId,
    type TMachineAddress,
    type TProcessId,
    splitAddressOrThrow,
} from '@flux/shared/types';
import { RedisConnection } from '../routing/redis/redis-connection.class';
import { GlobalClientManager } from './global/global-client.manager';
import { LocalAuthorityManager } from './local/local-authority.manager';
import { readMachineAddress, readProcessId } from '../routing/addressing.utils';
import { TConnectedClientSocket } from '../connected-client-socket.types';
import { NetworkAuthorityRedisCache } from '../register/network-authority-redis-cache.class';

export class AuthorityManager {
    private readonly machineAddress: TMachineAddress = readMachineAddress();
    private readonly processAddress: TProcessId = readProcessId();

    private readonly _globalClientManager: GlobalClientManager;
    private readonly _localAuthorityManager: LocalAuthorityManager;

    constructor(
        private readonly _redisConnection: RedisConnection,
        private readonly _clientMap: Map<TClientId, TConnectedClientSocket>,
        private readonly _networkAuthorityRedisCache: NetworkAuthorityRedisCache,
    ) {
        this._globalClientManager = new GlobalClientManager(this._redisConnection);
        this._localAuthorityManager = new LocalAuthorityManager(
            this._clientMap,
            this._networkAuthorityRedisCache,
        );

        // Subscribe to global events
        this._globalClientManager
            .onKickClient(this._localAuthorityManager.kickAuthority.bind(this._localAuthorityManager));
    }

    public kick(
        agentAddress: TAddress,
    ): void {
        const [machineAddress, processId, clientId] = splitAddressOrThrow(agentAddress);

        // * Not on the same machine
        if (machineAddress !== this.machineAddress) {
            this._globalClientManager.kickClient(agentAddress);
            return;
        }

        // * Not on the same process
        if (processId !== this.processAddress) {
            // ! Route through Redis for now, but change to direct process connection
            this._globalClientManager.kickClient(agentAddress);
            return;
        }

        // * This must be to local process
        this._localAuthorityManager
            .kickAuthority(clientId);
    }
}