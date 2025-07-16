import { Elysia, t } from 'elysia';
import { networkService } from '../../_decorators/network-service.decorator';
import { betterAuth } from '../../_decorators/auth.decorator';
import type { INetwork_S } from '../../repository/network.repository';

const createNetworkDTO = t.Object({
    alias: t.String()
});

export const apiRoutes = new Elysia({ prefix: '/api/networks' })
    .use(betterAuth);

export const networkRoutes = apiRoutes
    .use(networkService)

    /**
     * Creates a new network.
     * 
     * '/api/networks'
     */
    .post(
        '',
        ({
            body,
            networkService,
            user,
        }): Promise<INetwork_S> => {
            console.log('Creating network with body:', body);

            return networkService
                .networkRepository
                .createNetwork(
                    {
                        userId: user.id,
                        alias: body.alias,
                    },
                );
        },

        // Validate body
        {
            body: createNetworkDTO,
            auth: true,
        })

    /**
     * Reads all networks of the user.
     * 
     * '/api/networks'
     */
    .get(
        '',
        async ({
            networkService,
            user,
        }) => {
            console.log('Reading networks for user:', user.id);

            return await networkService
                .networkRepository
                .readUserNetworks(
                    user.id,
                );
        },

        // Validate body
        {
            auth: true,
        })
    ;
