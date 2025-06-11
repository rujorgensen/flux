import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import { NetworkAuthorityRedisSortedSet } from '@flux/mesh/store/redis/network-authority';
import type {
    TNetworkAuthorityCountAt,
} from '@flux/shared/types';
import { Elysia, t } from 'elysia';
import { networkIdValidatorPlugin } from './plugins';

const meshRedisConnection = await getMeshBunRedisConnection();
const networkAuthorityService: NetworkAuthorityRedisSortedSet = new NetworkAuthorityRedisSortedSet(meshRedisConnection.getClient());

export const networkAuthorityRoutes = new Elysia({ prefix: '/api/networks/:networkId/authorities' })
    .use(networkIdValidatorPlugin)

    /**
     * '/api/networks/:networkId/authorities/count?when={'now'}'
     * '/api/networks/:networkId/authorities/count?startDate={startDate}&endDate={endDate}'
     */
    .get('/count', ({ networkId, query }): Promise<TNetworkAuthorityCountAt> => {
        if (query.when === 'now') {
            return networkAuthorityService
                .readNetworkAuthorityCount(
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
     * '/api/networks/:networkId/authorities/connected'
     */
    .get('/connected', async ({ networkId, query }) => {
        const authorities = await networkAuthorityService
            .readNetworkAuthorities(
                networkId,
            );

        // Apply pagination
        const page = query.page || 1;
        const pageSize = query.pageSize || 10;
        const offset = (page - 1) * pageSize;
        
        const paginatedAuthorities = authorities.slice(offset, offset + pageSize);
        
        return {
            data: paginatedAuthorities,
            pagination: {
                page,
                pageSize,
                total: authorities.length,
                totalPages: Math.ceil(authorities.length / pageSize)
            }
        };
    }, {
        query: t.Object({
            page: t.Optional(t.Number({ minimum: 1 })),
            pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
        })
    })
    ;
