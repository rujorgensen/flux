// Check env
// const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;

globalThis.count ??= 0;
globalThis.count++;

console.log(`Reloaded ${globalThis.count} time(s)`);

import type {
    TMessageCallback,
} from '@flux/shared/ws';
import { nanoid } from 'nanoid';
import { authenticateNetworkAuthorityOrThrow, RetryableError } from './connector/auth/register-authority.auth';
import { FluxClientData } from './connector/flux-client-data.class';
import type {
    TChannnelAuthCallback,
} from './channel/channel.type';
import type { TAuthorizeCallback, TNetworkId_S } from '@flux/shared/types';
import { retry, StateManager } from '@flux/shared/utils';
import {
    createWSConnection,
    type FluxAgentNetworkConnection,
    type FluxWebSocketConnection,
} from '@flux/shared/connection';

export class FluxAuthority {

    public readonly id: string = nanoid();

    private fluxWebSocketConnection: FluxWebSocketConnection | undefined;
    private readonly fluxClientData: FluxClientData = new FluxClientData();

    private readonly stateManager: StateManager = new StateManager();

    // Has the client preivously connected to the network or registered as an authority?
    // ! TODO  MOVE 
    private readonly previousNetworkActions: {
        networkConnection: {
            identification: unknown,
            clientUUIDToken?: string,
        } | null;
        registerAuthority: {
            authorityKey: string,
            cb: (...args: any) => Promise<string>;
            authorizeNetworkChannel: TChannnelAuthCallback<any>,
        } | null;
    } = {
            networkConnection: null,
            registerAuthority: null,
        };

    constructor(
        private readonly networkId: string,
        private readonly options?: {
            domain?: string,
            secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
            retries?: number; // Number of times to retry a failed message
        },
    ) { }

    /**
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
    ): Promise<FluxAgentNetworkConnection> {
        this.previousNetworkActions.registerAuthority = {
            authorityKey,
            cb: authorizeNetworkClient,
            authorizeNetworkChannel,
        };

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

        return this
            .fluxWebSocketConnection
            .registerAuthority(
                authorizeNetworkClient,
                authorizeNetworkChannel,
            );
    }


    /**
     *
     * @param fn
     *
     * @returns { void }
     */
    public onWebRTConnectionState = this.stateManager.attachWebRTCStateListener;

    /**
     *
     * @param fn
     *
     * @returns { void }
     */
    public onNetworkState = this.stateManager.attachNetworkStateListener;

    public onMessage(
        cb: TMessageCallback,
    ): void {
        this.fluxClientData.onMessage(cb);
    }
}
