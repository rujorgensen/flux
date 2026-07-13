/**
 * One device calls createOffer() and shares the generated offer with the second device.
 * The second device calls acceptOffer(offer), generates an answer, and shares it back with the first device.
 * Both devices exchange ICE candidates (logged in the console) to establish the P2P connection.
 * Once connected, messages can be sent between devices.
 */

import type {
    TRTCState,
} from '@flux/shared/utils';
import type {
    FluxWebSocketClientConnection,
} from '@flux/shared/ws';

const peerConnectionConfig = {
    iceServers: [
        { urls: 'stun:stun.stunprotocol.org:3478' },
        { urls: 'stun:stun2.1.google.com:19302' },
        { urls: 'stun:stun.l.google.com:19302' },
    ],
};

export class ICEConnection {//extends RPCServer<'createOffer' | 'acceptOffer' | 'acceptAnswer'> {
    private readonly peerConnection = new RTCPeerConnection(peerConnectionConfig);
    private dataChannel: RTCDataChannel | undefined;
    private offerSDP: string | undefined;

    constructor(
        private readonly _fluxWebSocketClientConnection: FluxWebSocketClientConnection,
        private readonly _stateChange: (state: TRTCState) => void,
        /**
         * Called with every message received from the peer over the data channel.
         */
        private readonly _onMessage: (message: string) => void,
    ) {
        // super();

        // The non-initiating peer receives its data channel via this event.
        this.peerConnection.ondatachannel = (
            event: RTCDataChannelEvent,
        ) => {
            this._wireDataChannel(event.channel);
        };

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Send this ICE Candidate to the peer');
            }

            if (event.candidate === null) {
                this.offerSDP = JSON.stringify(this.peerConnection.localDescription);
                console.log("offerSDP:", this.offerSDP);
            }
        };

        this._fluxWebSocketClientConnection.registerMethod('createOffer', this.createOffer.bind(this));
        this._fluxWebSocketClientConnection.registerMethod('acceptOffer', this.acceptOffer.bind(this));
        this._fluxWebSocketClientConnection.registerMethod('acceptAnswer', this.acceptAnswer.bind(this));
        this._fluxWebSocketClientConnection.registerMethod('answerAcceptedByInitiator', this.answerAcceptedByInitiator.bind(this));
    }

    /**
     * This offer must be sent to the other peer.
     * 
     * @returns { Promise<RTCSessionDescriptionInit> } The WebRTC offer
     */
    private async createOffer(

    ): Promise<RTCSessionDescriptionInit> {
        console.log("creating offer and data channel");
        this._wireDataChannel(this.peerConnection.createDataChannel('flux-channel'));

        this._stateChange('creating-offer');
        const offer = await this.peerConnection.createOffer();

        await this.peerConnection.setLocalDescription(offer);
        console.log('Send this Offer to the peer:', offer);

        return offer;
    }

    /**
     * Accepts a WebRTC offer from the peer and generates an answer.
     * 
     * @param { RTCSessionDescriptionInit } offer - The offer from the remote peer
     * 
     * @returns { Promise<RTCSessionDescriptionInit> } The answer to send back
     */
    private async acceptOffer(
        offer: RTCSessionDescriptionInit,
    ): Promise<RTCSessionDescriptionInit> {
        this._stateChange('setting-remote-offer');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.peerConnection.createAnswer();

        this._stateChange('creating-answer');
        await this.peerConnection.setLocalDescription(answer);
        console.log('Send this Answer to the peer');

        return answer;
    }

    /**
     * Accepts a WebRTC answer from the peer.
     * 
     * @param { any } answer - The answer from the initiating peer
     * 
     * @returns { Promise<boolean> } True if the answer was accepted
     */
    private async acceptAnswer(
        answer: any,
    ): Promise<boolean> {
        this._stateChange('setting-remote-answer');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        this._stateChange('connected');

        console.log("the answer was accepted");

        return true;
    }

    /**
     * If remote (not initiator) the answer was accepted.
     * 
     * @param { boolean } answerAccepted - Whether the answer was accepted
     */
    private answerAcceptedByInitiator(
        answerAccepted: boolean,
    ): void {
        this._stateChange(answerAccepted ? 'connected' : 'failed');
    }

    /**
     * Wires up a data channel's lifecycle handlers. Used for both the initiator's
     * locally-created channel and the receiver's incoming channel so inbound
     * messages are delivered the same way on both ends.
     *
     * @param { RTCDataChannel } channel - The data channel to wire up
     */
    private _wireDataChannel(
        channel: RTCDataChannel,
    ): void {
        this.dataChannel = channel;

        channel.onopen = () => {
            console.log('Data channel opened');
        };

        channel.onclose = () => {
            console.log('Data channel closed');
        };

        channel.onmessage = (event: MessageEvent) => {
            this._onMessage(event.data as string);
        };
    }

    /**
     * Sends a message to the connected peer via the WebRTC data channel.
     *
     * @param { string } message - The message to send
     */
    public sendMessage(
        message: string,
    ): void {
        console.log('Sending message over webRTC');
        if (this.dataChannel && this.dataChannel.readyState === "open") {
            this.dataChannel.send(message);
        } else {
            console.warn("Connection is not established yet.", this.dataChannel?.readyState);
        }
    }

}