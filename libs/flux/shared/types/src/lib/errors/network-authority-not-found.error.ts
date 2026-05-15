/**
 * An authority was not found for the provided newtwork ID.
 */

import type { TNetworkId_S } from '@flux/shared/types';

export class NetworkAuthorityNotFoundError extends Error {
    public static message: string = 'Network authority not found for networkId';

    constructor(
        networkId: TNetworkId_S,
    ) {
        super(`${NetworkAuthorityNotFoundError.message}: '${networkId}'`);
        this.name = 'NetworkAuthorityNotFoundError';
    }
}
