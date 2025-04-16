// Check env
// const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;

globalThis.count ??= 0;
globalThis.count++;

console.log(`Reloaded ${globalThis.count} time(s)`);

import type {
    TCallback2,
} from '@flux/shared/ws';
import { nanoid } from 'nanoid';
import { authenticateNetworkAuthorityOrThrow, RetryableError } from './connector/auth/register-authority.auth';
import { FluxClientData } from './connector/flux-client-data.class';
import { retry } from './utils/promises.utils';
import {
    createWSConnection,
    TNetworkConnectionState,
    type FluxWebSocketConnection,
} from './connector/flux-ws-connection';
import type {
    TRTCState,
} from './connector/low-level-com/web-rtc/ice-connection';
import type {
    TChannnelAuthCallback,
} from './channel/channel.type';
import type { TAuthorizeCallback } from '@flux/shared/types';
import type { FluxNetworkConnection } from './flux-network.class';

export class FluxAuthority {

    public readonly id: string = nanoid();

    private fluxWebSocketConnection: FluxWebSocketConnection | undefined;
    private readonly fluxClientData: FluxClientData = new FluxClientData();
    private readonly stateListeners: Set<(rtcState: TRTCState) => void> = new Set();

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
    ): Promise<FluxNetworkConnection> {
        this.previousNetworkActions.registerAuthority = {
            authorityKey,
            cb: authorizeNetworkClient,
            authorizeNetworkChannel,
        };

        for (const listener of this.stateListeners) {
            listener('authorizing');
        }

        const ticket: string = await retry<any>(
            () => authenticateNetworkAuthorityOrThrow(
                this.networkId,
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
            this.webRTCConnectionState$$,
            this.registerAuthority.bind(this),
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
    public onWebRTConnectionState(
        fn: (
            webRTCConncetionState: TRTCState,
        ) => void,
    ): void {
        this.stateListeners.add(fn);
        //     listener('authorizing');

        // private readonly webRTCConnectionState$$: BehaviorSubject<TRTCState> = new BehaviorSubject<TRTCState>('idle');
    }

    /**
     *
     * @param fn
     *
     * @returns { void }
     */
    public onNetworkState(
        fn: (
            networkState: TNetworkConnectionState,
        ) => void,
    ): void {
        this.fluxWebSocketConnection.onNetworkState(fn);
    }

    public onMessage(
        cb: TCallback2,
    ): void {
        this.fluxClientData.onMessage(cb);
    }
}
