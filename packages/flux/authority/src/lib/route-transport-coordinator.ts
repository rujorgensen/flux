/**
 * Coordinate the route transport of messages.
 * 
 * Requires connectivity to the Flux platform, and a network.
 */
export class RouteCoordinator {

    constructor(
        fluxInterface: any, // Connection to the flux platform
    ) {
        fluxInterface
            .onChange('route', (route: any) => {

            });
    }

}