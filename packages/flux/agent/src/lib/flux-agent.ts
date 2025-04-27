// Check env
// const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;

globalThis.count ??= 0;
globalThis.count++;

console.log(`Reloaded ${globalThis.count} time(s)`);

import type {
    TClientOwnUId,
    TNetworkId_S,
} from '@flux/shared/types';
import type {
    TMessageCallback,
} from '@flux/shared/ws';
import type { FluxAgentNetworkConnection } from '@flux/shared/connection';
import {
    type FluxWebSocketConnection,
    createWSConnection,
} from '../../../../../libs/flux/shared/connection/src/lib/flux-ws-connection';
import { nanoid } from 'nanoid';
import { authenticateOrThrow } from './connector/auth/register-client.auth';
import { FluxClientData } from './connector/flux-client-data.class';
import { StateManager } from '@flux/shared/utils';


export class FluxAgent {

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
     *
     * @param { unknown }   identification
     * @param { string }    [clientUUIDToken]
     *
     * @returns { Promise<FluxAgentNetworkConnection> }
     */
    public async connect(
        identification: unknown,
        clientUUIDToken?: string,
    ): Promise<FluxAgentNetworkConnection> {
        this.previousNetworkActions.networkConnection = {
            identification,
            clientUUIDToken: clientUUIDToken,
        };

        this.stateManager.emitNetworkState('authorizing');

        const ticket = await authenticateOrThrow(
            this.networkId as TNetworkId_S,
            this.options?.domain ?? 'http://localhost:8080',
            identification,
        );

        this.fluxWebSocketConnection = createWSConnection(
            this.id,
            ticket,
            this.stateManager,
            async () => {
                await this.connect(
                    identification,
                    clientUUIDToken,
                );
            },
            // this.connect.bind(this),
            this.options,
        );

        this.fluxClientData.updateWsConnection(this.fluxWebSocketConnection);

        const fluxNetworkConnection: FluxAgentNetworkConnection = await this
            .fluxWebSocketConnection
            .connectToNetwork(
                clientUUIDToken as TClientOwnUId,
            );

        return fluxNetworkConnection;
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
