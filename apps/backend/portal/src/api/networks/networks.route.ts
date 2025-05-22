import { Elysia, t } from 'elysia';
import {
    type TNetworkChannelCountAt,
    type INetworkChannel,
    validateNetworkIdOrThrow,
} from '@flux/shared/types';
import { NetworkAgentRedisService } from '@flux/mesh/store/redis/network-agent';
import { NetworkChannelHash } from '@flux/mesh/store/redis/network-channel';
import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from 'packages/flux/mesh/src/routing/redis/redis-connection.class';
import type { TNetworkAgentCountAt } from 'libs/flux/shared/types/src/lib/agents/network-agent.type';

const meshRedisConnection = await getMeshBunRedisConnection();

const networkAgentRedisCacheService: NetworkAgentRedisService = new NetworkAgentRedisService(meshRedisConnection.getClient());

const redisConnection_: RedisConnection = getMeshRedisConnection();

const networkChannelRedisCacheService: NetworkChannelHash = new NetworkChannelHash(redisConnection_);

const networkIdValidatorPlugin = new Elysia()
    .derive({
        as: 'scoped'
    }, ({ params: { networkId } }) => {

        if (!validateNetworkIdOrThrow(networkId)) {
            throw new Error('Will not actually be thrown');
        }

        return {
            networkId,
        };
    })
    ;

export const networkChannelRoutes = new Elysia({ prefix: '/api/networks/:networkId/channels' })
    .use(networkIdValidatorPlugin)

    /**
     * '/api/networks/:networkId/channels/count?when={'now'}'
     * '/api/networks/:networkId/channels/count?startDate={startDate}&endDate={endDate}'
     */
    /**
     * Gets the channel count for a specific network
     * 
     * @param param0 Object containing networkId and query parameters
     * @param param0.networkId The ID of the network
     * @param param0.query Query parameters for filtering count
     * @returns Promise with network channel count information
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
    /**
     * Gets all channels for a specific network
     * 
     * @param param0 Object containing networkId
     * @param param0.networkId The ID of the network
     * @returns Promise with an array of network channels
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
    /**
     * Gets the agent count for a specific network
     * 
     * @param param0 Object containing networkId and query parameters
     * @param param0.networkId The ID of the network
     * @param param0.query Query parameters for filtering count
     * @returns Promise with network agent count information
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

    /**
     * Gets connected agents for a specific network
     * 
     * @param param0 Object containing networkId
     * @param param0.networkId The ID of the network
     * @returns Promise with the connected network agents
     */
    .get('/connected', ({ networkId }) => {
        return networkAgentRedisCacheService
            .readNetworkAgents(
                networkId,
            );
    })
    ;
