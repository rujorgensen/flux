import { Elysia, t } from 'elysia';
import { validateNetworkIdOrThrow } from '@flux/shared/types';
import { NetworkAgentRedisService } from '@flux/mesh/store/redis/network-agent';
import { NetworkUsageRedisCacheService } from '@flux/mesh/store/redis/network-usage';
import { NetworkAuthorityRedisSortedSet } from '@flux/mesh/store/redis/network-authority';
import { NetworkChannelHash } from '@flux/mesh/store/redis/network-channel';
import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from 'packages/flux/mesh/src/routing/redis/redis-connection.class';
import type { TNetworkAgentCountAt } from 'libs/flux/shared/types/src/lib/agents/network-agent.type';

const meshRedisConnection = await getMeshBunRedisConnection();

const networkAgentRedisCacheService: NetworkAgentRedisService = new NetworkAgentRedisService(meshRedisConnection.getClient());
const networkUsageRedisCacheService: NetworkUsageRedisCacheService = new NetworkUsageRedisCacheService(meshRedisConnection.getClient());
const networkAuthorityRedisCacheService: NetworkAuthorityRedisSortedSet = new NetworkAuthorityRedisSortedSet(meshRedisConnection.getClient());

const redisConnection_: RedisConnection = getMeshRedisConnection();

const networkChannelRedisCacheService: NetworkChannelHash = new NetworkChannelHash(redisConnection_);

export const networkRoutes = new Elysia({ prefix: '/api/networks/:networkId' })
    .derive(({ params: { networkId } }) => {

        if (!validateNetworkIdOrThrow(networkId)) {
            throw new Error('Will not actually be thrown');
        }

        return {
            networkId,
        };
    })

    .get('access-key', ({ networkId }) => {
        return {
            accessKey: '1234567890',
        };
    })

    .get('configuration', ({ networkId }) => {
        return {
            alias: 'Cobália network',
            networkId,
            totalCapacity: 932191,
            memberSince: new Date('2023-01-01T00:00:00Z'),
        };
    })

    .get('connected-authorities', ({ networkId }) => {
        return networkAuthorityRedisCacheService
            .readNetworkAuthorityCount(
                networkId,
            );
    })

    .get('channels', ({ networkId }) => {
        return networkChannelRedisCacheService
            .readNetworkChannelCount(
                networkId,
            );
    })

    .get('data-usage', ({ networkId }) => {
        return networkUsageRedisCacheService
            .readNetworkUsageBytes(
                networkId,
            );
    })

    .get('connected-agents', ({ networkId }) => {
        return networkAgentRedisCacheService
            .readNetworkAgentCount(
                networkId,
            );
    })
    ;

export const networkAgentRoutes = new Elysia({ prefix: '/api/networks/:networkId/agents' })
    .derive(({ params: { networkId } }) => {

        if (!validateNetworkIdOrThrow(networkId)) {
            throw new Error('Will not actually be thrown');
        }

        return {
            networkId,
        };
    })

    /**
     * '/api/networks/:networkId/agents/count?when={'now'}'
     * '/api/networks/:networkId/agents/count?startDate={startDate}&endDate={endDate}'
     */
    .get('/count', ({ networkId, query }): Promise<TNetworkAgentCountAt> => {
        if (query.when === 'now') {
            return networkAgentRedisCacheService
                .readNetworkAgentCount(
                    networkId,
                );
        }

        throw new Error('Only ?when=now is supported as query parameter');
    },
        {
            query: t.Object({
                when: t.Optional(t.Literal('now')),
                startDate: t.Optional(t.Date()),
                endDate: t.Optional(t.Date()),
            })
        })

    .get('/connected', ({ networkId }) => {
        return networkAgentRedisCacheService
            .readNetworkAgents(
                networkId,
            );
    })
    ;
