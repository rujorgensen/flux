import { NetworkAgentRedisService } from "@flux/mesh/store/redis/network-agent";
import { NetworkChannelHash } from "@flux/mesh/store/redis/network-channel";
import { TNetworkId_S } from "@flux/shared/types";
import { NetworkAuthorityRedisService } from '@flux/mesh/store/redis/network-authority';

export class NetworkService {

    constructor(
        private readonly _networkAgentRedisCacheService: NetworkAgentRedisService,
        private readonly _networkChannelRedisCacheService: NetworkChannelHash,
        private readonly _networkAuthorityRedisService: NetworkAuthorityRedisService,
    ) {}

    public async readConnectionStatus(
        networkId: TNetworkId_S,
    ): Promise<{
        agents: number;
        authorities: number;
        channels: number;
    }> {
        const allNetworkAgents = await this._networkAgentRedisCacheService.readAgents(networkId);
        const allNetworkAuthorities = await this._networkAuthorityRedisService.readAuthorities(networkId);
        const allNetworkChannels = await this._networkChannelRedisCacheService
            .readNetworkChannelCount(
                networkId,
            );

        return {
            agents: allNetworkAgents.length,
            authorities: allNetworkAuthorities.length,
            channels: allNetworkChannels.count,
        };
    }
}