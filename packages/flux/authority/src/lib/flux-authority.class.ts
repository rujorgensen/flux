// Make TypeScript happy
declare global {
    var authorityLoadCount: number | null;
}

globalThis.authorityLoadCount ??= 0;
globalThis.authorityLoadCount++;

console.log(`[flux-authority] Reloaded ${globalThis.authorityLoadCount} time(s)`);

import { nanoid } from 'nanoid';
import {
    authenticateNetworkAuthorityOrThrow,
    RetryableError,
} from './connector/auth/register-authority.auth';
import { FluxClientData } from './connector/flux-client-data.class';
import type {
    TChannnelAuthCallback,
} from './channel/channel.type';
import {
    type TAuthorizeCallback,
    type TNetworkId_S,
    validateNetworkIdOrThrow,
} from '@flux/shared/types';
import {
    type TFluxClientUID,
    getMachineUID,
    retryOrThrow,
    StateManager,
} from '@flux/shared/utils';
import {
    type FluxWebSocketConnection,
    createWSConnection,
} from '@flux/shared/connection';
import { FluxAuthorityNetworkConnection } from './flux-authority-network.class';

const DEFAULT_FLUX_DOMAIN: string = 'https://mesh.persistica.io';

interface IRegisterAuthorityConfiguration<T, M> {
    networkAccessToken: string; // The key to authenticate with the network
    authorizeAgentConnection: TAuthorizeCallback<T>; // Callback to authorize agent connections
    authorizeChannelAccess: TChannnelAuthCallback<M>; // Callback to authorize channel connections
}

export class FluxAuthority {

    public readonly id: string = nanoid();

    private fluxWebSocketConnection: FluxWebSocketConnection | undefined;
    private readonly fluxClientData: FluxClientData = new FluxClientData();

    private readonly stateManager: StateManager = new StateManager();

    constructor(
        private readonly networkId: string,
        private readonly options?: {
            domain?: string,
            secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
            retries?: number; // Number of times to retry a failed message
        },
    ) {
        // Validate user input
        validateNetworkIdOrThrow(this.networkId);
    }

    /**
     * Registers an authority on the network.
     * 
     * @param { IRegisterAuthorityConfiguration } registerAuthorityConfiguration
     * 
     * @returns { Promise<FluxAuthorityNetworkConnection> } The authority network connection
     */
    public async registerAuthority<T, M>(
        registerAuthorityConfiguration: IRegisterAuthorityConfiguration<T, M>,
    ): Promise<FluxAuthorityNetworkConnection> {
        this.stateManager.emitNetworkState('authorizing');

        const machineUID: TFluxClientUID | undefined = await getMachineUID() ?? undefined;

        try {
            const ticket: string = await retryOrThrow<any>(
                () => authenticateNetworkAuthorityOrThrow(
                    this.networkId as TNetworkId_S,
                    this.options?.domain ?? DEFAULT_FLUX_DOMAIN,
                    registerAuthorityConfiguration.networkAccessToken,
                    {
                        machineUID,
                    },
                ),
                (err: unknown) => err instanceof RetryableError,
                {
                    retries: 10_000,
                    delayMs: 500,
                    onRetry: (
                        attempt: number,
                        retries: number,
                    ) => {
                        console.log(`[RegisterAuthority] Retrying... (attempt: ${attempt} of ${retries})`);
                    },
                },
            );

            this.fluxWebSocketConnection = createWSConnection(
                this.id,
                ticket,
                this.stateManager,
                async () => {
                    // For reconnection logic
                    this.registerAuthority(
                        {
                            ...registerAuthorityConfiguration,
                        },
                    );
                },
                this.options,
            );

            this.fluxClientData.updateWsConnection(this.fluxWebSocketConnection);

            await this
                .fluxWebSocketConnection
                .registerAuthority(
                    registerAuthorityConfiguration.authorizeAgentConnection,
                    registerAuthorityConfiguration.authorizeChannelAccess,
                );

            return Promise.resolve(new FluxAuthorityNetworkConnection(this.fluxWebSocketConnection));
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Attaches a listener for network connection state changes.
     */
    public readonly onNetworkState = this.stateManager.attachNetworkStateListener.bind(this.stateManager);
}
