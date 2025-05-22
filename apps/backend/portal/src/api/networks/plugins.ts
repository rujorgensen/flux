import { validateNetworkIdOrThrow } from '@flux/shared/types';
import Elysia from 'elysia';

export const networkIdValidatorPlugin = new Elysia()
    .derive({
        as: 'scoped'
    }, ({ params: { networkId } }) => {

        if (!validateNetworkIdOrThrow(networkId)) {
            throw new Error('Will not actually be thrown');
        }

        return {
            networkId,
        };
    })
    ;