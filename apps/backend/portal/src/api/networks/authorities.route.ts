import { Elysia, t } from 'elysia';
import type {
    TNetworkAuthorityCountAt,
} from '@flux/shared/types';
import { type TClientId, isNanoId } from '@flux/shared/types';
import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import { networkIdValidatorPlugin } from './plugins';
import { NetworkAuthorityRedisSortedSet } from '@flux/mesh/store/redis/network-authority';

const meshRedisConnection = await getMeshBunRedisConnection();
const networkAuthorityService: NetworkAuthorityRedisSortedSet = new NetworkAuthorityRedisSortedSet(meshRedisConnection.getClient());

export const networkAuthorityRoutes = new Elysia({
    prefix: '/api/networks/:networkId/authorities',
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
     * '/api/networks/:networkId/authorities/connected'
     */
    .get('/connected', ({ networkId }) => {
        return networkAuthorityService
            .readNetworkAuthorities(
                networkId,
            );
    })

    /**
     * 'DELETE /api/networks/:networkId/authorities/:authorityId'
     *
     * Kicks (removes) a connected authority from the network.
     */
    .delete('/:authorityId', ({ networkId, params: { authorityId }, error }) => {
        if (!isNanoId(authorityId)) {
            return error(400, { message: 'Invalid authority ID.' });
        }

        return networkAuthorityService
            .unregister(
                networkId,
                authorityId as TClientId,
            )
            .then(() => ({ message: `Authority ${authorityId} kicked successfully.` }));
    }, {
        response: {
            200: t.Object({ message: t.String() }),
            400: t.Object({ message: t.String() }),
        },
    })
    ;
