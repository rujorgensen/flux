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
import { retry, StateManager } from '@flux/shared/utils';
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
     * @param { TAuthorizeCallback }        authorizeNetworkClient
     * @param { TChannnelAuthCallback }     authorizeNetworkChannel
     *
     * @returns { Promise<void> }
     */
    public async registerAuthority<T, M>(
        authorityKey: string,
        authorizeNetworkClient: TAuthorizeCallback<T>,
        authorizeNetworkChannel: TChannnelAuthCallback<M>,
    ): Promise<FluxAuthorityNetworkConnection> {
        this.stateManager.emitNetworkState('authorizing');

        const ticket: string = await retry<any>(
            () => authenticateNetworkAuthorityOrThrow(
                this.networkId as TNetworkId_S,
                this.options?.domain ?? 'http://localhost:8080',
                authorityKey,
            ),
            (err: unknown) => err instanceof RetryableError,
            {
                retries: 10_000,
                delayMs: 500,
            },
        );

        this.fluxWebSocketConnection = createWSConnection(
            this.id,
            ticket,
            this.stateManager,
            async () => {
                this.registerAuthority(
                    authorityKey,
                    authorizeNetworkClient,
                    authorizeNetworkChannel,
                );
            },
            this.options,
        );

        this.fluxClientData.updateWsConnection(this.fluxWebSocketConnection);

        await this
            .fluxWebSocketConnection
            .registerAuthority(
                authorizeNetworkClient,
                authorizeNetworkChannel,
            );

        return Promise.resolve(new FluxAuthorityNetworkConnection(this.fluxWebSocketConnection));
    }

    public readonly onWebRTConnectionState = this.stateManager.attachWebRTCStateListener;
    public readonly onNetworkState = this.stateManager.attachNetworkStateListener;
    public readonly onMessage = this.fluxClientData.onMessage;
}
