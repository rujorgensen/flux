import { Elysia, t } from 'elysia';
import type {
    TNetworkChannelCountAt,
    INetworkChannel,
} from '@flux/shared/types';
import { NetworkAgentRedisService } from '@flux/mesh/store/redis/network-agent';
import { NetworkChannelHash } from '@flux/mesh/store/redis/network-channel';
import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from 'packages/flux/mesh/src/routing/redis/redis-connection.class';
import type { TNetworkAgentCountAt } from 'libs/flux/shared/types/src/lib/agents/network-agent.type';
import { networkIdValidatorPlugin } from './plugins';

const meshRedisConnection = await getMeshBunRedisConnection();
const networkAgentRedisCacheService: NetworkAgentRedisService = new NetworkAgentRedisService(meshRedisConnection.getClient());
const redisConnection_: RedisConnection = getMeshRedisConnection();
const networkChannelRedisCacheService: NetworkChannelHash = new NetworkChannelHash(redisConnection_);

export const networkChannelRoutes = new Elysia({ prefix: '/api/networks/:networkId/channels' })
    .use(networkIdValidatorPlugin)

    /**
     * '/api/networks/:networkId/channels/count?when={'now'}'
     * '/api/networks/:networkId/channels/count?startDate={startDate}&endDate={endDate}'
     */
    .get('/count', ({ networkId, query }): Promise<TNetworkChannelCountAt> => {
        if (query.when === 'now') {
            return networkChannelRedisCacheService
                .readNetworkChannelCount(
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

    /**
     * '/api/networks/:networkId/channels
     */
    .get('', ({ networkId }): Promise<INetworkChannel[]> => {
        return networkChannelRedisCacheService
            .readNetworkChannels(
                networkId,
            );
    })
    ;

export const networkAgentRoutes = new Elysia({ prefix: '/api/networks/:networkId/agents' })
    .use(networkIdValidatorPlugin)

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
