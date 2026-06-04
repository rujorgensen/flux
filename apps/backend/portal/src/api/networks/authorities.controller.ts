import { Elysia, t } from 'elysia';
import {
    type TClientId,
    type TNetworkAuthorityCountAt,
    type TNetworkId_S,
    isClientId,
} from '@flux/shared/types';
import { networkIdValidatorPlugin } from './plugins';
import { kickSocket } from './kick-socket.util';
import { networkDecorator } from '../../_decorators/network-service.decorator';
import type { NetworkAuthorityRedisService } from '@flux/mesh/store/redis/network-authority';

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
    networkAuthorityService: NetworkAuthorityRedisService,
): Promise<void> {
    const authority = await networkAuthorityService
        .readAuthorityByClientId(
            networkId,
            authorityId,
        );

    if (!authority) {
        return;
    }

    await kickSocket(
        'authority',
        authority.address,
    );
}

export const networkAuthorityController = new Elysia({
    prefix: '/api/networks/:networkId/authorities',
})
    .error({
        InvalidAuthorityIdError,
    })

    .use(networkDecorator)

    .use(networkIdValidatorPlugin)

    /**
     * '/api/networks/:networkId/authorities/count?when={'now'}'
     * '/api/networks/:networkId/authorities/count?startDate={startDate}&endDate={endDate}'
     */
    .get('/count', ({ networkId, query, serviceProviders }): Promise<TNetworkAuthorityCountAt> => {
        if (query.when === 'now') {
            return serviceProviders
                .networkAuthorityService
                .readAuthorityCount(
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
        serviceProviders,
    }) => {
        const page = query.page ?? 1;
        const pageSize = Math.min(query.pageSize ?? 25, 100);
        const all = await serviceProviders
            .networkAuthorityService
            .readAuthorities(networkId);
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
        serviceProviders,
    }) => {
        const authorities = await serviceProviders
            .networkAuthorityService
            .readAuthorities(
                networkId,
            );

        await Promise.all(
            authorities.map((authority) => kickAuthoritySocket(
                networkId,
                authority.id,
                serviceProviders.networkAuthorityService,
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
        serviceProviders,
    }) => {
        if (!isClientId(authorityId)) {
            throw new InvalidAuthorityIdError();
        }

        await kickAuthoritySocket(
            networkId,
            authorityId,
            serviceProviders.networkAuthorityService,
        );

        return { message: `Authority ${authorityId} kicked successfully.` };
    }, {

    })
    ;
