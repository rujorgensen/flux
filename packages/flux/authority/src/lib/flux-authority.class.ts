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
import type { TAuthorizeCallback, TNetworkId_S } from '@flux/shared/types';
import {
    type TFluxClientUID,
    getMachineUID,
    retry,
    StateManager,
} from '@flux/shared/utils';
import {
    type FluxWebSocketConnection,
    createWSConnection,
} from '@flux/shared/connection';
import { FluxAuthorityNetworkConnection } from './flux-authority-network.class';

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
    ) { }

    /**
     * Registers an authority on the network.
     * 
     * @param { string }                    authorityKey
     * @param { TAuthorizeCallback }        authorizeNetworkAgent
     * @param { TChannnelAuthCallback }     authorizeNetworkChannel
     *
     * @returns { Promise<void> }
     */
    public async registerAuthority<T, M>(
        authorityKey: string,
        authorizeNetworkAgent: TAuthorizeCallback<T>,
        authorizeNetworkChannel: TChannnelAuthCallback<M>,
    ): Promise<FluxAuthorityNetworkConnection> {
        this.stateManager.emitNetworkState('authorizing');

        const machineUID: TFluxClientUID | undefined = await getMachineUID() ?? undefined;

        const ticket: string = await retry<any>(
            () => authenticateNetworkAuthorityOrThrow(
                this.networkId as TNetworkId_S,
                this.options?.domain ?? 'http://localhost:5100',
                authorityKey,
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
                this.registerAuthority(
                    authorityKey,
                    authorizeNetworkAgent,
                    authorizeNetworkChannel,
                );
            },
            this.options,
        );

        this.fluxClientData.updateWsConnection(this.fluxWebSocketConnection);

        await this
            .fluxWebSocketConnection
            .registerAuthority(
                authorizeNetworkAgent,
                authorizeNetworkChannel,
            );

        return Promise.resolve(new FluxAuthorityNetworkConnection(this.fluxWebSocketConnection));
    }

    public readonly onNetworkState = this.stateManager.attachNetworkStateListener.bind(this.stateManager);
}
