/**
 * An unknown client (either agent or authority) error.
 */

import type { TClientId, TProcessAddress } from '../routing.type';

export class UnknownClientError extends Error {
    constructor(
        clientId: TClientId,
        address: TProcessAddress,
    ) {
        super(`Client with ID '${clientId}' not found. Terminated at address: '${address}'.`);
        this.name = 'UnknownClientError';
    }
}
