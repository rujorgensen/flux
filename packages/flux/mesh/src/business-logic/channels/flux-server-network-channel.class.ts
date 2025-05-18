import type {
    ConnectedClient,
} from '../../_classes/connected-client.class';

export class FluxNetworkChannelServer {

    private readonly members: Set<ConnectedClient> = new Set();

    constructor(
        private readonly channelName: string,
        private readonly onCloseCallback: (channelName: string) => void
    ) { }

    /**
     *
     * @param clientId
     * @param message
     */
    public publish(
        clientId: string,
        message: string,
    ): void {
        for (const member of this.members) {
            if (member.id !== clientId) {
                member.message(message);
            }
        }
    }

    public leave(
        connectedClient: ConnectedClient,
    ): void {
        this.members.delete(connectedClient);

        if (this.members.size === 0) {
            this.onCloseCallback(this.channelName);
        }
    }

    public join(
        connectedClient: ConnectedClient,
    ): void {
        this.members.add(connectedClient);
    }
}
