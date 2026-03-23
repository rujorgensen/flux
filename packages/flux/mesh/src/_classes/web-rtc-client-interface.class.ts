import type {
    TProcessAddress,
} from '@flux/shared/types';
import { GlobalRPCClient2 } from '../routing/rpc/core/global-rpc-client.class';
import {
    type TRPCResponseCallbackFunction,
    RPCClient,
} from '@flux/shared/ws';

export class WebRTCClient extends RPCClient<
    'createOffer' | 'acceptOffer' | 'acceptAnswer' | 'answerAcceptedByInitiator'
> {
    constructor(
        private readonly _originProcessAddress: TProcessAddress,
        private readonly _sendToRPCServer: (
            data: any, // ! Use 'unknown' or Bun.BufferSource (does not work)
            compress?: boolean | undefined
        ) => number,

        // Handle the response from the RPC server
        private readonly _handleResponseMessage: (
            fn: TRPCResponseCallbackFunction,
        ) => void
    ) {
        super(_sendToRPCServer, _handleResponseMessage);
    }

    /**
     * Creates a WebRTC offer.
     * 
     * @returns { Promise<unknown> } The WebRTC offer
     */
    public createOffer(): Promise<unknown> {
        // TODO TYPE OFFER
        return super.call(this._originProcessAddress, 'createOffer');
    }

    /**
     * Accepts a WebRTC offer and creates an answer.
     * 
     * @param { unknown } offer - The WebRTC offer from remote
     * 
     * @returns { Promise<unknown> } The answer
     */
    public acceptOfferAndCreateAnswer(
        offer: unknown // TODO TYPE OFFER
    ): Promise<unknown> {
        // TODO TYOPE answer
        return super.call(this._originProcessAddress, 'acceptOffer', offer);
    }

    /**
     * Accepts a WebRTC answer from the remote client.
     * 
     * @param { unknown } answer - The WebRTC answer
     * 
     * @returns { Promise<boolean> } True if accepted
     */
    public acceptAnswer(
        answer: unknown // TODO TYPE answer
    ): Promise<boolean> {
        return super.call(this._originProcessAddress, 'acceptAnswer', answer);
    }

    /**
     * Notifies the remote client that the answer was accepted.
     * 
     * @param { boolean } answerAccepted - Whether the answer was accepted
     * 
     * @returns { Promise<boolean> }
     */
    public answerWasAccepted(answerAccepted: boolean): Promise<boolean> {
        return super.call(
            this._originProcessAddress,
            'answerAcceptedByInitiator',
            answerAccepted
        );
    }
}

export class GlobalWebRTCClient extends GlobalRPCClient2<
    'createOffer' | 'acceptOffer' | 'acceptAnswer' | 'answerAcceptedByInitiator'
> {
    /**
     * Creates a WebRTC offer.
     * 
     * @returns { Promise<unknown> } The WebRTC offer
     */
    public createOffer(): Promise<unknown> {
        // TODO TYPE OFFER
        return super.call('createOffer');
    }

    /**
     * Accepts a WebRTC offer and creates an answer.
     * 
     * @param { unknown } offer - The WebRTC offer from remote
     * 
     * @returns { Promise<unknown> } The answer
     */
    public acceptOfferAndCreateAnswer(
        offer: unknown // TODO TYPE OFFER
    ): Promise<unknown> {
        // TODO TYOPE answer
        return super.call('acceptOffer', offer);
    }

    /**
     * Accepts a WebRTC answer from the remote client.
     * 
     * @param { unknown } answer - The WebRTC answer
     * 
     * @returns { Promise<boolean> } True if accepted
     */
    public acceptAnswer(
        answer: unknown // TODO TYPE answer
    ): Promise<boolean> {
        return super.call('acceptAnswer', answer);
    }

    /**
     * Notifies the remote client that the answer was accepted.
     * 
     * @param { boolean } answerAccepted - Whether the answer was accepted
     * 
     * @returns { Promise<boolean> }
     */
    public answerWasAccepted(answerAccepted: boolean): Promise<boolean> {
        return super.call('answerAcceptedByInitiator', answerAccepted);
    }
}
