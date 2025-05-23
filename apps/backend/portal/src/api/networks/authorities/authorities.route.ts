import { Elysia, t } from 'elysia';
import type {
    TNetworkAuthorityCountAt,
} from '@flux/shared/types';
import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import { networkIdValidatorPlugin } from '../plugins';
import { NetworkAuthorityRedisSortedSet } from '@flux/mesh/store/redis/network-authority';

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

    .get('/connected', ({ networkId }) => {
        return networkAuthorityService
            .readNetworkAuthorities(
                networkId,
            );
    })
    ;
