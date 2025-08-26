/**
 * An authority was not found for the provided newtwork ID.
 */

import type { TNetworkId_S } from '@flux/shared/types';

export class NetworkAuthorityNotFoundError extends Error {
    constructor(
        networkId: TNetworkId_S,
    ) {
        super(`Network authority not found for networkId: '${networkId}'`);
        this.name = 'NetworkAuthorityNotFoundError';
    }
}
