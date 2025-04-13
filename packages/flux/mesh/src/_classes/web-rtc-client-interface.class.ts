import {
    RPCClient,
    TProcessAddress,
    TRPCResponseCallbackFunction,
} from '@flux/shared/types';
import { GlobalRPCClient2 } from '../routing/rpc/core/global-rpc-client.class';

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
            fn: TRPCResponseCallbackFunction
        ) => void
    ) {
        super(_sendToRPCServer, _handleResponseMessage);
    }

    public createOffer(): Promise<unknown> {
        // TODO TYPE OFFER
        return super.call(this._originProcessAddress, 'createOffer');
    }

    public acceptOfferAndCreateAnswer(
        offer: unknown // TODO TYPE OFFER
    ): Promise<unknown> {
        // TODO TYOPE answer
        return super.call(this._originProcessAddress, 'acceptOffer', offer);
    }

    public acceptAnswer(
        answer: unknown // TODO TYPE answer
    ): Promise<boolean> {
        return super.call(this._originProcessAddress, 'acceptAnswer', answer);
    }

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
    public createOffer(): Promise<unknown> {
        // TODO TYPE OFFER
        return super.call('createOffer');
    }

    public acceptOfferAndCreateAnswer(
        offer: unknown // TODO TYPE OFFER
    ): Promise<unknown> {
        // TODO TYOPE answer
        return super.call('acceptOffer', offer);
    }

    public acceptAnswer(
        answer: unknown // TODO TYPE answer
    ): Promise<boolean> {
        return super.call('acceptAnswer', answer);
    }

    public answerWasAccepted(answerAccepted: boolean): Promise<boolean> {
        return super.call('answerAcceptedByInitiator', answerAccepted);
    }
}
