import { Elysia, t } from 'elysia';
import { validateNetworkIdOrThrow } from '@flux/shared/types';
import { NetworkAgentRedisService } from '@flux/mesh/store/redis/network-agent';
import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import type { TNetworkAgentCountAt } from 'libs/flux/shared/types/src/lib/agents/network-agent.type';

const meshRedisConnection = await getMeshBunRedisConnection();

const networkAgentRedisCacheService: NetworkAgentRedisService = new NetworkAgentRedisService(meshRedisConnection.getClient());

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