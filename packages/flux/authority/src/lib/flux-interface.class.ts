/**
 * Interface to the flux platform:
 * 
 * Requires socket connectivity to the Flux platform, and a verified network.
 */

import type { FluxWebSocketConnection } from '@flux/shared/connection';
import type { IPackageStatus } from '@flux/shared/types';

export class FluxInterface {

    constructor(
        private readonly socketConnection: FluxWebSocketConnection, // Connection to the flux platform
    ) { }

    public messageReport(
        packageStatus: Omit<IPackageStatus, 'txNode'>,
    ): void {
        // this.socketConnection.reportMessage(packageStatus);
    }
}