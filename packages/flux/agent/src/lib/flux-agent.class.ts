// Check env
// const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;

globalThis.agentLoadCount ??= 0;
globalThis.agentLoadCount++;

console.log(`[flux-agent] Reloaded ${globalThis.agentLoadCount} time(s)`);

import {
    type TAgentOwnUId,
    type TNetworkId_S,
    validateAgentUIDOrThrow,
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
import { authenticateAgentOrThrow } from './connector/auth/register-client.auth';
import { FluxClientData } from './connector/flux-client-data.class';
import { getMachineUID, StateManager } from '@flux/shared/utils';

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
     * Connect to the network using provided identification.
     * 
     * @param { unknown }   identification
     * @param { string }    [clientUId]
     *
     * @returns { Promise<FluxAgentNetworkConnection> }
     */
    public async connect(
        identification: unknown,
        clientUId?: string,
    ): Promise<FluxAgentNetworkConnection> {
        this.stateManager.emitNetworkState('authorizing');

        if (clientUId && !validateAgentUIDOrThrow(clientUId)) {
            throw new Error('Will never be thrown');
        }

        // getMachineUID
        const ticket = await authenticateAgentOrThrow(
            this.networkId as TNetworkId_S,
            this.options?.domain ?? 'http://localhost:8080',
            identification,
            {
                clientUId: clientUId as TAgentOwnUId,
                machineUID: await getMachineUID() ?? undefined,
            },
        );

        this.fluxWebSocketConnection = createWSConnection(
            this.id,
            ticket,
            this.stateManager,
            async () => {
                await this.connect(
                    identification,
                    clientUId,
                );
            },
            this.options,
        );

        this.fluxClientData.updateWsConnection(this.fluxWebSocketConnection);

        const fluxNetworkConnection: FluxAgentNetworkConnection = await this
            .fluxWebSocketConnection
            .connectToNetwork();

        return fluxNetworkConnection;
    }

    public disconnect(

    ): void {
        this.fluxWebSocketConnection?.disconnect();
    }

    /**
     *
     * @param fn
     *
     * @returns { void }
     */
    public onWebRTConnectionState = this.stateManager.attachWebRTCStateListener.bind(this.stateManager);

    /**
     *
     * @param fn
     *
     * @returns { void }
     */
    public onNetworkState = this.stateManager.attachNetworkStateListener.bind(this.stateManager);

    public onMessage(
        cb: TMessageCallback,
    ): void {
        this.fluxClientData.onMessage(cb);
    }
}
