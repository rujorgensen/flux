/**
 * An unknown client (either agent or authority) error.
 */

import type { TProcessAddress } from '../routing.type';
import type { TClientId } from '@flux/shared/types';

export class UnknownClientError extends Error {
    constructor(
        clientId: TClientId,
        address: TProcessAddress,
    ) {
        super(`Client with ID '${clientId}' not found. Terminated at address: '${address}'.`);
        this.name = 'UnknownClientError';
    }
}
