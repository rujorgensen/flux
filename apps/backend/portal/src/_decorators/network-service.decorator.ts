import Elysia from 'elysia';
import { NetworkRepository } from '../repository/network.repository';
import { getPortalPgRepository } from '@backend/core/prisma';
import { getMeshRedisConnection, RedisConnection } from '@flux/mesh';
import { NetworkChannelHash } from '@flux/mesh/store/redis/network-channel';
import { NetworkService } from '../_services/network.service';
import { NetworkAgentRedisService } from '@flux/mesh/store/redis/network-agent';
import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import { NetworkAuthorityRedisSortedSet } from '@flux/mesh/store/redis/network-authority';
import { getNetworkTokenServiceInstance } from '@backend/features/network';

export const networkRepository: NetworkRepository = new NetworkRepository(
    getPortalPgRepository(),
);

const redisConnection_: RedisConnection = getMeshRedisConnection();
const meshRedisConnection = await getMeshBunRedisConnection();
const networkChannelRedisCacheService: NetworkChannelHash = new NetworkChannelHash(redisConnection_);
const networkAgentRedisCacheService: NetworkAgentRedisService = new NetworkAgentRedisService(meshRedisConnection.getClient());

export const networkService: NetworkService = new NetworkService(
    networkAgentRedisCacheService,
    networkChannelRedisCacheService,
    new NetworkAuthorityRedisSortedSet(meshRedisConnection.getClient()),
);

export const networkDecorator = new Elysia()
    .decorate('serviceProviders', {
        networkRepository,
        networkService,
        networkTokenService: getNetworkTokenServiceInstance(),
    })
    ;
