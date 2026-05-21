import { Elysia, t, sse } from 'elysia';
import {
    type TChannelName,
    type TClientId,
    type TNetworkChannelCountAt,
    TNetworkToken_S,
    validateChannelNameOrThrow,
    InvaliChannelNameError,
} from '@flux/shared/types';
import { NetworkChannelHash } from '@flux/mesh/store/redis/network-channel';
import { getNetworkTokenServiceInstance, NetworkTokenCache } from '@backend/features/network';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from '@flux/mesh';
import { networkIdValidatorPlugin } from './plugins';

const redisConnection_: RedisConnection = getMeshRedisConnection();
const networkChannelRedisCacheService: NetworkChannelHash = new NetworkChannelHash(redisConnection_);
const networkTokenCache: NetworkTokenCache = new NetworkTokenCache(
    getMeshRedisConnection(),
    getNetworkTokenServiceInstance(),
);

class InvalidChannelNameHttpError extends Error {
    status = 400;

    constructor(
    ) {
        super('Invalid channel name');
    }
}

class UnauthorizedError extends Error {
    status = 401;

    constructor(
    ) {
        super('Unauthorized: invalid network token');
    }
}

/**
 * Bridges a Redis pub/sub channel to an async generator that yields SSE-formatted
 * data strings. Cleans up the Redis subscription when the client disconnects.
 */
async function* createChannelEventStream(
    networkId: string,
    channelName: TChannelName,
    signal: AbortSignal,
): AsyncGenerator<ReturnType<typeof sse>> {
    const queue: { data: string; clientId: TClientId; }[] = [];
    let wakeup: (() => void) | null = null;

    const onPacket = (
        clientId: TClientId,
        data: string,
    ): void => {
        queue.push({
            data,
            clientId: clientId,
        });

        if (wakeup) {
            wakeup();
            wakeup = null;
        }
    };

    redisConnection_.subscribeToNetworkChannel(networkId, channelName, onPacket);

    try {
        yield sse(JSON.stringify({ type: 'connected', channelName, timestamp: new Date().toISOString() }));

        while (!signal.aborted) {
            if (queue.length > 0) {
                const item = queue.shift();

                if (item === undefined) {
                    continue;
                }

                yield sse(JSON.stringify({
                    type: 'packet',
                    data: item.data,
                    clientId: item.clientId,
                    timestamp: new Date().toISOString(),
                }));
            } else {
                await new Promise<void>((resolve) => {
                    if (signal.aborted) {
                        resolve();

                        return;
                    }

                    wakeup = resolve;
                    signal.addEventListener('abort', () => resolve(), { once: true });
                });
            }
        }
    } finally {
        redisConnection_.unsubscribeFromNetworkChannel(networkId, channelName, onPacket);
    }
}


export const networkChannelController = new Elysia({
    prefix: '/api/networks/:networkId/channels',
})
    .error({
        InvalidChannelNameHttpError,
        UnauthorizedError,
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

    .get('/:channelName/members', async ({
        networkId,
        params,
    }) => {
        try {
            validateChannelNameOrThrow(params.channelName);
        } catch (error) {
            if (error instanceof InvaliChannelNameError) {
                console.error('Invalid channel name:', error.message);
            }

            throw new InvalidChannelNameHttpError();
        }

        return await networkChannelRedisCacheService
            .readNetworkChannelMemberAddresses(
                networkId,
                params.channelName as TChannelName,
            );
    })

    /**
     * 'GET /api/networks/:networkId/channels/:channelName?token=<networkToken>'
     *
     * Opens a Server-Sent Events stream that forwards every data packet
     * published on the given channel to the connected client in real time.
     * Requires the network access token as a query parameter.
     */
    .get('/:channelName', async function* ({ networkId, params, request }) {
        yield* createChannelEventStream(
            networkId,
            params.channelName as TChannelName,
            request.signal,
        );
    }, {
        query: t.Object({ token: t.String() }),
        beforeHandle: async ({ networkId, params, query, set }) => {
            try {
                validateChannelNameOrThrow(params.channelName);
            } catch {
                set.status = 400;

                return { message: 'Invalid channel name' };
            }

            if (!await networkTokenCache.isValidToken(
                networkId,
                query.token as TNetworkToken_S,
            )) {
                set.status = 401;

                return { message: 'Unauthorized: invalid network token' };
            }

            // Explicit return required by Elysia's beforeHandle type signature.
            return;
        },
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
            throw new InvalidChannelNameHttpError();
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
