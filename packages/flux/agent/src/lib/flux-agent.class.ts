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
    isRetryableConnectionError,
    retryOrThrow,
    StateManager,
} from '@flux/shared/utils';

const DEFAULT_FLUX_DOMAIN: string = 'https://mesh.persistica.io';

// How many times connect() retries while waiting for an Authority to register on the network.
// Deliberately not exposed as an option — Agents run on untrusted client machines, so this stays
// under the SDK's control.
const MAX_CONNECT_ATTEMPTS: number = 100;

export class FluxAgent {
    public readonly id: string = nanoid();
    public readonly networkId: TNetworkId_S;

    private fluxWebSocketConnection: FluxWebSocketConnection | undefined;

    private readonly fluxClientData: FluxClientData = new FluxClientData();
    private readonly stateManager: StateManager = new StateManager();
    private readonly options: {
        domain?: string;
        secretKey?: string;
        retries?: number;
    } | undefined;

    constructor(
        networkId: string,
        options?: {
            domain?: string;
            secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
            retries?: number; // Number of times to retry a failed message
        },
    ) {
        // Validate user input
        if (!validateNetworkIdOrThrow(networkId)) {
            throw new Error('Will never be thrown');
        }

        this.networkId = networkId;
        this.options = options;
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

        try {
            if (clientUId && !validateAgentUIDOrThrow(clientUId)) {
                throw new Error('Will never be thrown');
            }

            // The same handshake serves the first connect and every reconnect: the
            // mesh's upgrade ticket expires long before a long-lived Agent does, so
            // the socket has to be able to mint a new one on its own (#497).
            const mintTicket = (): Promise<string> => this.mintTicket(
                domain,
                identification,
                clientUId as TAgentOwnUId | undefined,
            );

            this.fluxWebSocketConnection = createWSConnection(
                this.id,
                await mintTicket(),
                mintTicket,
                this.stateManager,
                {
                    ...this.options,
                    domain,
                },
            );

            this.fluxClientData.updateWsConnection(this.fluxWebSocketConnection);

            return await this
                .fluxWebSocketConnection
                .connectToNetwork();

        } catch (error) {
            this.stateManager.emitNetworkState('auth-error');
            return Promise.reject(error);
        }
    }

    /**
     * Authenticates against the mesh and returns a ticket for the WebSocket
     * upgrade, retrying while the mesh is unreachable and while no Authority has
     * registered on the network yet.
     */
    private async mintTicket(
        domain: string,
        identification: unknown,
        clientUId: TAgentOwnUId | undefined,
    ): Promise<string> {
        this.stateManager.emitNetworkState('authorizing');

        let warnedWaitingForAuthority: boolean = false;
        let warnedMeshUnreachable: boolean = false;

        // Which failure caused the pending retry — the two have different
        // meanings for a listener and must not share a message.
        let lastError: unknown;

        return retryOrThrow(
            async () => {
                return authenticateAgentOrThrow(
                    this.networkId,
                    domain,
                    identification,
                    {
                        clientUId: clientUId as TAgentOwnUId,
                        machineUID: (await getMachineUID()) ?? undefined,
                    },
                );
            },

            // Retry while no Authority has appeared yet, and while the mesh
            // itself is unreachable. The latter used to fall straight through
            // to the caller, so a network blip during startup left the Agent
            // permanently disconnected while an Authority in the same
            // situation would have retried through it.
            (error: unknown) => {
                lastError = error;

                return (error instanceof NetworkAuthorityNotFoundError)
                    || isRetryableConnectionError(error);
            },

            {
                // Fixed by the SDK, not the consuming app: Agents run on untrusted client
                // machines, so the mesh operator — not the app — controls how long an Agent
                // waits for an Authority to appear.
                retries: MAX_CONNECT_ATTEMPTS,
                delayMs: 500,
                onRetry: (
                    attempt: number,
                    retries: number,
                ): number => {
                    // An unreachable mesh means this Agent never authenticated at
                    // all, which is a different thing to tell a listener than
                    // "authenticated, but nobody is home".
                    if (isRetryableConnectionError(lastError)) {
                        this.stateManager.emitNetworkState('authorizing');

                        if (!warnedMeshUnreachable) {
                            warnedMeshUnreachable = true;
                            console.warn(
                                `[flux-agent] Cannot reach the mesh at '${domain}'. Retrying in the background ` +
                                `up to ${retries} times; the Agent connects on its own once the mesh answers. ` +
                                `If this never resolves, check the 'domain' option points at the Mesh (not the Portal).`,
                            );
                        }

                        // Longer ceiling than the waiting-for-Authority case: an
                        // outage lasts minutes, and a down mesh must not be hit
                        // twice a second by every Agent that survived it.
                        return Math.min(30_000, 500 * (2 ** attempt));
                    }

                    // Otherwise: this Agent authenticated, but no Authority is registered
                    // on the network yet. Surface that instead of sitting silently on
                    // 'authorizing' — listeners can now show a meaningful state.
                    this.stateManager.emitNetworkState('waiting-for-authority');

                    if (!warnedWaitingForAuthority) {
                        warnedWaitingForAuthority = true;
                        console.warn(
                            `[flux-agent] No Authority is registered on network '${this.networkId}' yet. ` +
                            `An Authority must be running before Agents can join; retrying up to ${retries} times ` +
                            `until one appears. If this never resolves, start your Authority process (or check its ` +
                            `Network Access Token).`,
                        );
                    }

                    // Backoff until 3 seconds
                    return Math.min(3_000, 500 + (attempt * 200));
                },
            },
        );
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
     * Attaches a listener for messages received directly from a peer over a
     * WebRTC data channel (off-Mesh, peer-to-peer).
     *
     * NB: unlike channel messages, the sender identity is NOT Mesh-stamped
     * (see ADR-0004) — the message is whatever arrived on the peer connection.
     */
    public onDirectPublish = this.stateManager.attachDirectMessageListener.bind(this.stateManager);

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
