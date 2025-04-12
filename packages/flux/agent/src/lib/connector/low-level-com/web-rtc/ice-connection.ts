/**
 * One device calls createOffer() and shares the generated offer with the second device.
 * The second device calls acceptOffer(offer), generates an answer, and shares it back with the first device.
 * Both devices exchange ICE candidates (logged in the console) to establish the P2P connection.
 * Once connected, messages can be sent between devices.
 */

import { FluxWebSocketClientConnection } from '../websocket/ws-client';

const peerConnectionConfig = {
    iceServers: [
        { urls: 'stun:stun.stunprotocol.org:3478' },
        { urls: 'stun:stun2.1.google.com:19302' },
        { urls: 'stun:stun.l.google.com:19302' },
    ],
};

export type TRTCState = 'idle' |
    'creating-offer' |
    'setting-remote-offer' |
    'creating-answer' |
    'setting-remote-answer' |
    'connected' |
    'failed'
    ;

export class ICEConnection {//extends RPCServer<'createOffer' | 'acceptOffer' | 'acceptAnswer'> {
    //  public readonly state$$: TRTCState = 'idle';
    private readonly peerConnection = new RTCPeerConnection(peerConnectionConfig);
    private dataChannel: any; //  = this.peerConnection.createDataChannel('flux-channel');

    private offerSDP: any;

    constructor(
        //  private readonly _fluxWebSocketClientConnection: FluxWebSocketClientConnection,
        private readonly _fluxWebSocketClientConnection: FluxWebSocketClientConnection,
        private readonly _stateChange: (state: TRTCState) => void,
    ) {
        // super();

        this.peerConnection.ondatachannel = (
            event: any,
        ) => {
            console.log("*********** GOT DATAT SCHANNNEL ");
            
            this.dataChannel = event.channel;
            this.dataChannel.onopen = () => console.log('ReceiveChannel opened');
            // this.dataChannel.onmessage = (e: any) => this.receivedMessage = e.data;

            this.dataChannel.onmessage = (event: any) => {
                console.log('Receiving ICE event', event);
            };
            this.dataChannel.onopen = () => {
                console.log("Opened");
            };
            this.dataChannel.onclose = () => {
                console.log("Opened");
            };
        };

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Send this ICE Candidate to the peer');
            }

            if (event.candidate === null) {
                this.offerSDP = JSON.stringify(this.peerConnection.localDescription);
                //       console.log("offerSDP:", this.offerSDP);
            }
        };

        this._fluxWebSocketClientConnection.registerMethod('createOffer', this.createOffer.bind(this));
        this._fluxWebSocketClientConnection.registerMethod('acceptOffer', this.acceptOffer.bind(this));
        this._fluxWebSocketClientConnection.registerMethod('acceptAnswer', this.acceptAnswer.bind(this));
        this._fluxWebSocketClientConnection.registerMethod('answerAcceptedByInitiator', this.answerAcceptedByInitiator.bind(this));
    }

    /**
     * This offer must be sent to the other peer.
     */
    private async createOffer(

    ): Promise<RTCSessionDescriptionInit> {
        console.log("creating offer and data channel");
        this.dataChannel = this.peerConnection.createDataChannel('flux-channel');

        this._stateChange('creating-offer');
        const offer = await this.peerConnection.createOffer();

        await this.peerConnection.setLocalDescription(offer);
        console.log('Send this Offer to the peer:', offer);

        return offer;
    }

    /**
     * 
     * @param { RTCSessionDescriptionInit } offer 
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
     * @param answer 
     * @returns 
     */
    private answerAcceptedByInitiator(
        answerAccepted: boolean,
    ): void {
        this._stateChange(answerAccepted ? 'connected' : 'failed');
    }

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