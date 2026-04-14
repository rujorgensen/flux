import { Elysia, t } from 'elysia';
import { type TClientId, type TNetworkAuthorityCountAt, type TNetworkId_S, isNanoId } from '@flux/shared/types';
import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import { networkIdValidatorPlugin } from './plugins';
import { NetworkAuthorityRedisSortedSet } from '@flux/mesh/store/redis/network-authority';
import { kickSocket } from './kick-socket.util';

const meshRedisConnection = await getMeshBunRedisConnection();
const networkAuthorityService: NetworkAuthorityRedisSortedSet = new NetworkAuthorityRedisSortedSet(meshRedisConnection.getClient());

class InvalidAuthorityIdError extends Error {
    status = 400;

    constructor(
    ) {
        super('Invalid authority ID');
    }
}

/**
 * Reads the full address for a connected authority from Redis, then sends a
 * kick message to the mesh process that owns the socket so it is closed.
 * The mesh server's `GlobalClientManager.onKickClient` listener picks this up.
 */
async function kickAuthoritySocket(
    networkId: TNetworkId_S,
    authorityId: TClientId,
): Promise<void> {
    const authority = await networkAuthorityService
        .readNetworkAuthorityByClientId(
            networkId,
            authorityId,
        );

    if (!authority) {
        return;
    }

    await kickSocket(authority.address);
}

export const networkAuthorityController = new Elysia({
    prefix: '/api/networks/:networkId/authorities',
})
    .error({
        InvalidAuthorityIdError,
    })
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
     * '/api/networks/:networkId/authorities/connected?page={page}&pageSize={pageSize}'
     */

    .get('/connected', async ({
        networkId,
        query,
    }) => {
        const page = query.page ?? 1;
        const pageSize = Math.min(query.pageSize ?? 25, 100);
        const all = await networkAuthorityService.readNetworkAuthorities(networkId);
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
     * 'DELETE /api/networks/:networkId/authorities'
     *
     * Kicks (removes) all connected authorities from the network and closes their sockets.
     */
    .delete('', async ({
        networkId,
    }) => {
        const authorities = await networkAuthorityService
            .readNetworkAuthorities(networkId);

        await Promise.all(
            authorities.map((authority) => kickAuthoritySocket(
                networkId,
                authority.id,
            )),
        );

        return { message: `${authorities.length} authority(ies) kicked successfully.`, count: authorities.length };
    })

    /**
     * 'DELETE /api/networks/:networkId/authorities/:authorityId'
     *
     * Kicks (removes) a connected authority from the network.
     */
    .delete('/:authorityId', async ({
        networkId,
        params: { authorityId },
    }) => {
        if (!isNanoId(authorityId)) {
            throw new InvalidAuthorityIdError();
        }

        await kickAuthoritySocket(
            networkId,
            authorityId,
        );

        return { message: `Authority ${authorityId} kicked successfully.` };
    }, {

    })
    ;
