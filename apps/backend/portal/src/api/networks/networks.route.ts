import { Elysia, t } from 'elysia';
import type {
    TNetworkChannelCountAt,
    INetworkChannel,
} from '@flux/shared/types';
import { NetworkChannelService } from '@flux/mesh/store/redis/network-channel';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from 'packages/flux/mesh/src/routing/redis/redis-connection.class';
import { networkIdValidatorPlugin } from './plugins';

const redisConnection_: RedisConnection = getMeshRedisConnection();
const networkChannelRedisCacheService: NetworkChannelService = new NetworkChannelService(redisConnection_);

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
