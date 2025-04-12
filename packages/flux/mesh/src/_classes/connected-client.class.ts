import { TConnectedClientSocket } from '../main';
import { WebRTCClient } from './web-rtc-client-interface.class';

export class ConnectedClient {
    public readonly rpcClient: WebRTCClient;

    private readonly messageListeners: Set<(...args: any) => void> = new Set();

    constructor(
        public readonly id: string,
        public readonly sw: TConnectedClientSocket,
        public readonly clientName?: string // TODO: CHECK IF UNIQU,
    ) {
        console.error('TODODODODODODODOD');
        this.rpcClient = new WebRTCClient(
            'TODOODODOD DASMKLÆD S' as any,
            <any>this.sw.send.bind(this.sw),
            () => <any>this.onMessage.bind(this),
            () => {} // TODO
        );
    }

    /**
     * Distribute message to listeners on this client.
     *
     * @param { string } message
     *
     * @returns { void }
     */
    public message(message: string): void {
        for (const listener of this.messageListeners) {
            listener(message);
        }
    }

    /**
     * Subscribe to messages from this client
     *
     * @param { (message: string) => void } callback
     *
     * @returns { void }
     */
    public onMessage(callback: (message: string) => void): void {
        this.messageListeners.add(callback);
    }
}
