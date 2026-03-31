import { Elysia, t } from 'elysia';
import { NetworkAgentRedisService } from '@flux/mesh/store/redis/network-agent';
import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import type { TNetworkAgentCountAt } from 'libs/flux/shared/types/src/lib/agents/network-agent.type';
import { type TClientId, isNanoId } from '@flux/shared/types';
import { networkIdValidatorPlugin } from './plugins';

const meshRedisConnection = await getMeshBunRedisConnection();
const networkAgentRedisCacheService: NetworkAgentRedisService = new NetworkAgentRedisService(meshRedisConnection.getClient());

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

    /**
     * '/api/networks/:networkId/agents/connected'
     */
    .get('/connected', ({ networkId }) => {
        return networkAgentRedisCacheService
            .readNetworkAgents(
                networkId,
            );
    })

    /**
     * 'DELETE /api/networks/:networkId/agents/:agentId'
     *
     * Kicks (removes) a connected agent from the network.
     */
    .delete('/:agentId', ({
        networkId,
        params: { agentId },
        error,
    }) => {
        if (!isNanoId(agentId)) {
            return error(400, { message: 'Invalid agent ID.' });
        }

        return networkAgentRedisCacheService
            .unregisterNetworkAgent(
                networkId,
                agentId as TClientId,
            )
            .then(() => ({ message: `Agent ${agentId} kicked successfully.` }));
    }, {
        response: {
            200: t.Object({ message: t.String() }),
            400: t.Object({ message: t.String() }),
        },
    })
    ;
