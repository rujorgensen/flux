import Elysia from 'elysia';
import { NetworkRepository } from '../repository/network.repository';
import { getPortalPgRepository } from '@backend/core/prisma';
import { getMeshRedisConnection, RedisConnection } from '@flux/mesh';
import { NetworkChannelService } from '@flux/mesh/store/redis/network-channel';
import { NetworkService } from '../_services/network.service';
import { NetworkAgentRedisService } from '@flux/mesh/store/redis/network-agent';
import { NetworkAuthorityRedisService } from '@flux/mesh/store/redis/network-authority';
import { getNetworkTokenServiceInstance } from '@backend/features/network';

// * Connection
const redisConnection_: RedisConnection = getMeshRedisConnection();

// * Repositories
export const networkRepository: NetworkRepository = new NetworkRepository(
    getPortalPgRepository(),
);

// * Services
const networkChannelRedisService: NetworkChannelService = new NetworkChannelService(
    redisConnection_,
);

const networkAgentService: NetworkAgentRedisService = new NetworkAgentRedisService(
    redisConnection_,
);

const networkAuthorityService: NetworkAuthorityRedisService = new NetworkAuthorityRedisService(
    redisConnection_,
);

export const networkService: NetworkService = new NetworkService(
    networkAgentService,
    networkChannelRedisService,
    networkAuthorityService,
);

export const networkDecorator = new Elysia()
    .decorate('serviceProviders', {
        networkRepository,
        networkService,
        networkTokenService: getNetworkTokenServiceInstance(),
        networkAgentService,
        networkAuthorityService,
    })
    ;
