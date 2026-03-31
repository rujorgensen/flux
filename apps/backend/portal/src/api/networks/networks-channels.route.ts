import { Elysia, t } from 'elysia';
import type {
    TNetworkChannelCountAt,
    INetworkChannel,
} from '@flux/shared/types';
import { type TChannelName, validateChannelNameOrThrow } from '@flux/shared/types';
import { NetworkChannelHash } from '@flux/mesh/store/redis/network-channel';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from 'packages/flux/mesh/src/routing/redis/redis-connection.class';
import { networkIdValidatorPlugin } from './plugins';

const redisConnection_: RedisConnection = getMeshRedisConnection();
const networkChannelRedisCacheService: NetworkChannelHash = new NetworkChannelHash(redisConnection_);

export const networkChannelRoutes = new Elysia({
    prefix: '/api/networks/:networkId/channels',
})
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
    .get('', ({ networkId }): Promise<INetworkChannel[]> => {
        return networkChannelRedisCacheService
            .readNetworkChannels(
                networkId,
            );
    })

    /**
     * 'DELETE /api/networks/:networkId/channels/:channelName'
     *
     * Closes (removes) an active channel from the network.
     */
    .delete('/:channelName', ({ networkId, params: { channelName }, error }) => {
        try {
            validateChannelNameOrThrow(channelName);
        } catch {
            return error(400, { message: 'Invalid channel name.' });
        }

        return networkChannelRedisCacheService
            .deleteNetworkChannel(
                networkId,
                channelName as TChannelName,
            )
            .then(() => ({ message: `Channel "${channelName}" closed successfully.` }));
    }, {
        response: {
            200: t.Object({ message: t.String() }),
            400: t.Object({ message: t.String() }),
        },
    })
    ;
