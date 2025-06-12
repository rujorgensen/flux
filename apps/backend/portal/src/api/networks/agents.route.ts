import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import { NetworkAgentRedisService } from '@flux/mesh/store/redis/network-agent';
import { Elysia, t } from 'elysia';
import type { TNetworkAgentCountAt } from 'libs/flux/shared/types/src/lib/agents/network-agent.type';
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
    .get('/connected', async ({ networkId, query }) => {
        const page = query.page || 1;
        const pageSize = query.pageSize || 10;
        
        const result = await networkAgentRedisCacheService
            .readNetworkAgentsPaginated(
                networkId,
                page,
                pageSize
            );
        
        return {
            data: result.data,
            pagination: {
                page,
                pageSize,
                total: result.total,
                totalPages: Math.ceil(result.total / pageSize)
            }
        };
    }, {
        query: t.Object({
            page: t.Optional(t.Number({ minimum: 1 })),
            pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
        })
    })
    ;
