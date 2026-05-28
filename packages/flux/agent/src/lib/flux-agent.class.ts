import {
    type TAgentOwnUId,
    type TNetworkId_S,
    validateAgentUIDOrThrow,
    validateNetworkIdOrThrow,
    NetworkAuthorityNotFoundError,
} from '@flux/shared/types';
import type { TMessageCallback } from '@flux/shared/ws';
import type { FluxAgentNetworkConnection } from '@flux/shared/connection';
import {
    type FluxWebSocketConnection,
    createWSConnection,
} from '../../../../../libs/flux/shared/connection/src/lib/flux-ws-connection';
import { nanoid } from 'nanoid';
import { authenticateAgentOrThrow } from './connector/auth/register-client.auth';
import { FluxClientData } from './connector/flux-client-data.class';
import {
    getMachineUID,
    retryOrThrow,
    StateManager,
} from '@flux/shared/utils';

const DEFAULT_FLUX_DOMAIN: string = 'https://mesh.persistica.io';

export class FluxAgent {
    public readonly id: string = nanoid();

    private fluxWebSocketConnection: FluxWebSocketConnection | undefined;

    private readonly fluxClientData: FluxClientData = new FluxClientData();
    private readonly stateManager: StateManager = new StateManager();

    constructor(
        private readonly networkId: string,
        private readonly options?: {
            domain?: string;
            secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
            retries?: number; // Number of times to retry a failed message
        },
    ) {
        // Validate user input
        validateNetworkIdOrThrow(this.networkId);
    }

    /**
     * Connect to the network using provided identification.
     * 
     * @param { unknown } identification - The identification payload to authenticate with
     * @param { string } [clientUId] - Optional client UID to use
     * 
     * @returns { Promise<FluxAgentNetworkConnection> } The network connection
     */
    public async connect(
        identification: unknown,
        clientUId?: string,
    ): Promise<FluxAgentNetworkConnection> {
        const domain: string = this.options?.domain ?? DEFAULT_FLUX_DOMAIN;

        this.stateManager.emitNetworkState('authorizing');

        if (clientUId && !validateAgentUIDOrThrow(clientUId)) {
            throw new Error('Will never be thrown');
        }

        try {
            const ticket = await retryOrThrow(
                async () => {
                    return authenticateAgentOrThrow(
                        this.networkId as TNetworkId_S,
                        domain,
                        identification,
                        {
                            clientUId: clientUId as TAgentOwnUId,
                            machineUID: (await getMachineUID()) ?? undefined,
                        },
                    );
                },

                // Retry if no authority was found yet
                (error: unknown) => (error instanceof NetworkAuthorityNotFoundError),

                {
                    retries: 100,
                    delayMs: 500,
                    // Backoff until 3 seconds
                    onRetry: (attempt) => Math.min(3_000, 500 + (attempt * 200)),
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
                {
                    ...this.options,
                    domain,
                },
            );

            this.fluxClientData.updateWsConnection(this.fluxWebSocketConnection);

            const fluxNetworkConnection: FluxAgentNetworkConnection = await this
                .fluxWebSocketConnection
                .connectToNetwork();

            return fluxNetworkConnection;
        } catch (error) {
            this.stateManager.emitNetworkState('auth-error');
            return Promise.reject(error);
        }
    }

    /**
     * Disconnects from the network.
     */
    public disconnect(

    ): void {
        this.fluxWebSocketConnection?.disconnect();
    }

    /**
     * Attaches a listener for WebRTC connection state changes.
     */
    public onWebRTConnectionState = this.stateManager.attachWebRTCStateListener.bind(this.stateManager);

    /**
     * Attaches a listener for network connection state changes.
     */
    public onNetworkState = this.stateManager.attachNetworkStateListener.bind(this.stateManager);

    /**
     * Registers a callback to be called when a message is received.
     * 
     * @param { TMessageCallback } cb - Callback to invoke when a message is received
     */
    public onMessage(
        cb: TMessageCallback,
    ): void {
        this.fluxClientData.onMessage(cb);
    }
}
