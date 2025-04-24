/**
 * An unknown client (either agent or authority) error.
 */

import type { TClientId, TProcessAddress } from '../routing.type';

export class UnknownClientError extends Error {
    constructor(
        clientId: TClientId,
        address: TProcessAddress,
    ) {
        super(`Client not found, with ID '${clientId}'. Terminated at address: '${address}'`);
        this.name = 'UnknownClientError';
    }
}
