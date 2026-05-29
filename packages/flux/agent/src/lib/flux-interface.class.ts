/**
 * Interface to the flux platform:
 * 
 * Requires socket connectivity to the Flux platform, and a verified network.
 */

import type { IPackageStatus } from '@flux/shared/types';
import type { FluxWebSocketConnection } from '../../../../../libs/flux/shared/connection/src/lib/flux-ws-connection';

export class FluxInterface {

    constructor(
        private readonly socketConnection: FluxWebSocketConnection, // Connection to the flux platform
    ) {}

    public messageReport(
        packageStatus: Omit<IPackageStatus, 'txNode'>,
    ): void {
        // this.socketConnection.reportMessage(packageStatus);
    }
}