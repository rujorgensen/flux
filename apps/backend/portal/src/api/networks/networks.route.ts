import { NetworkChannelHash } from '@flux/mesh/store/redis/network-channel';
import type {
    INetworkChannel,
    TNetworkChannelCountAt,
} from '@flux/shared/types';
import { Elysia, t } from 'elysia';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from 'packages/flux/mesh/src/routing/redis/redis-connection.class';
import { networkIdValidatorPlugin } from './plugins';

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
     * '/api/networks/:networkId/channels'
     */
    .get('', async ({ networkId, query }) => {
        const page = query.page || 1;
        const pageSize = query.pageSize || 10;
        
        const result = await networkChannelRedisCacheService
            .readNetworkChannelsPaginated(
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
