import { Elysia, t } from 'elysia';
import {
    networkDecorator,
} from '../../_decorators/network-service.decorator';
import { betterAuth } from '../../_decorators/auth.decorator';
import type { INetwork_S } from '../../repository/network.repository';
import type { TNetworkId_S } from '@flux/shared/types';

const createNetworkDTO = t.Object({
    alias: t.String()
});

export const apiRoutes = new Elysia({ prefix: '/api/networks' })
    .use(betterAuth)
    ;

export const networksController = apiRoutes
    // .use(networkIdValidatorPlugin)
    .use(networkDecorator)

    /**
     * Creates a new network.
     * 
     * '/api/networks'
     */
    .post(
        '',
        async ({
            body,
            serviceProviders,
            user,
        }): Promise<INetwork_S> => {
            console.log('Creating network with body:', body);

            const createdNetwork: INetwork_S = await serviceProviders
                .networkRepository
                .createNetwork(
                    {
                        userId: user.id,
                        alias: body.alias,
                    },
                );

            // Create initial token for the network
            await serviceProviders
                .networkTokenService
                .createToken(
                    createdNetwork.id as TNetworkId_S,
                    user.id,
                );

            return createdNetwork;
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
            serviceProviders,
            user,
        }) => {
            console.log('Reading networks for user:', user.id);

            return await serviceProviders
                .networkRepository
                .readUserNetworks(
                    user.id,
                );
        },

        // Auth required
        {
            auth: true,
        })


    /**
    * Reads network connection status
    * 
    * '/api/networks/:networkId/connection-status'
    */
    .get(
        ':networkId/connection-status',
        async ({
            params,
            serviceProviders,
            user,
        }) => {
            console.log('Reading network connection status for user:', user.id);

            return await serviceProviders
                .networkService
                .readConnectionStatus(
                    params.networkId as TNetworkId_S,
                );
        },

        // Validate body
        {
            auth: true,
        })

    /**
    * Reads network connection history for the last 24 hours.
    * 
    * '/api/networks/:networkId/connection-history'
    */
    .get(
        ':networkId/connection-history',
        async ({
            params,
            serviceProviders,
            user,
        }) => {
            console.log('Reading network connection history for user:', user.id);

            const to = new Date();
            const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

            return await serviceProviders
                .networkRepository
                .readConnectionHistory(
                    params.networkId as TNetworkId_S,
                    {
                        from,
                        to,
                    },
                );
        },

        // Validate body
        {
            auth: true,
        })

    /**
      * Deletes a network by ID.
     * Only the network admin can delete the network.
     * 
     * '/api/networks/:networkId'
     */
    .delete(
        ':networkId',
        async ({
            params,
            serviceProviders,
            user,
        }): Promise<void> => {
            console.log('Deleting network:', params.networkId, 'for user:', user.id);

            return serviceProviders
                .networkRepository
                .deleteNetwork(
                    {
                        networkId: params.networkId as TNetworkId_S,
                        userId: user.id,
                    },
                );
        },

        // Validate params
        {
            params: t.Object({
                networkId: t.String(),
            }),
            auth: true,
        })
    ;
