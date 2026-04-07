import { Elysia, t } from 'elysia';
import {
    type INetworkChannel,
    type TChannelName,
    type TNetworkChannelCountAt,
    validateChannelNameOrThrow,
} from '@flux/shared/types';
import { NetworkChannelHash } from '@flux/mesh/store/redis/network-channel';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from '@flux/mesh';
import { networkIdValidatorPlugin } from './plugins';

const redisConnection_: RedisConnection = getMeshRedisConnection();
const networkChannelRedisCacheService: NetworkChannelHash = new NetworkChannelHash(redisConnection_);

class InvalidChannelNameError extends Error {
    status = 400;

    constructor(
    ) {
        super('Invalid channel name');
    }
}


export const networkChannelController = new Elysia({
    prefix: '/api/networks/:networkId/channels',
})
    .error({
        InvalidChannelNameError,
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
     * '/api/networks/:networkId/channels?page={page}&pageSize={pageSize}'
     */
    .get('', async ({
        networkId,
        query,
    }) => {
        const page = query.page ?? 1;
        const pageSize = Math.min(query.pageSize ?? 25, 100);
        const all = await networkChannelRedisCacheService.readNetworkChannels(networkId);
        const total = all.length;
        const start = (page - 1) * pageSize;

        return {
            data: all.slice(start, start + pageSize),
            total,
            page,
            pageSize,
        };
    },
        {
            query: t.Object({
                page: t.Optional(t.Number({ minimum: 1 })),
                pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
            }),
        },
    )

    /**
     * 'GET /api/networks/:networkId/channels/:channelName'
     *
     * Opens a Server-Sent Events stream that forwards every data packet
     * published on the given channel to the connected client in real time.
     */
    .get('/:channelName', ({
        networkId,
        params,
        request,
    }) => {
        const { channelName } = params;

        try {
            validateChannelNameOrThrow(channelName);
        } catch {
            throw new InvalidChannelNameError();
        }

        const { signal } = request;

        return new Response(
            new ReadableStream({
                start(
                    controller: ReadableStreamDefaultController<string>,
                ): void {
                    // Send a connected confirmation packet immediately
                    controller.enqueue(
                        `data: ${JSON.stringify({ type: 'connected', channelName, timestamp: new Date().toISOString() })}\n\n`,
                    );

                    const packetCallback = (
                        data: string,
                    ): void => {
                        if (signal.aborted) return;

                        controller.enqueue(
                            `data: ${JSON.stringify({ type: 'packet', data, timestamp: new Date().toISOString() })}\n\n`,
                        );
                    };

                    redisConnection_.subscribeToNetworkChannel(
                        networkId,
                        channelName as TChannelName,
                        packetCallback,
                    );

                    signal.addEventListener('abort', () => {
                        redisConnection_.unsubscribeFromNetworkChannel(
                            networkId,
                            channelName as TChannelName,
                            packetCallback,
                        );

                        controller.close();
                    });
                },
            }),
            {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no',
                },
            },
        );
    })

    /**
     * 'DELETE /api/networks/:networkId/channels/:channelName'
     *
     * Closes (removes) an active channel from the network.
     */
    .delete('/:channelName', ({
        networkId,
        params,
    }) => {
        const { channelName } = params;

        try {
            validateChannelNameOrThrow(channelName);
        } catch {
            throw new InvalidChannelNameError();
        }

        return networkChannelRedisCacheService
            .deleteNetworkChannel(
                networkId,
                channelName as TChannelName,
            )
            .then(() => ({ message: `Channel "${channelName}" closed successfully.` }));
    }, {

    })
    ;
