import { RPCServer } from '@flux/shared';

export class ConnectToRemoteClient extends RPCServer<'createOffer' | 'acceptOffer'> {
    private peerConnection = new RTCPeerConnection();
    private dataChannel = this.peerConnection.createDataChannel('persistica-flux-channel');

    constructor(

    ) {
        super();
    }

    // private async createOffer(

    // ) {
    //     const offer = await this.peerConnection.createOffer();

    //     await this.peerConnection.setLocalDescription(offer);
    //     console.log('Send this Offer to the peer:', offer);
    // }
}