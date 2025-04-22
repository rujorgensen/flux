import {
    GlobalWebRTCClient,
    WebRTCClient,
} from '../_classes/web-rtc-client-interface.class';

export const facilitateWebRTCConnection = async (
    initiator: WebRTCClient | GlobalWebRTCClient,
    remoteClient: GlobalWebRTCClient
) => {
    //   console.log('Orchestrate ICS COnnection', initiator, remoteClient);

    // initiator.
    const offer = await initiator.createOffer();
    console.log('Created offer:', !!offer);

    const answer = await remoteClient.acceptOfferAndCreateAnswer(offer);
    console.log('Got answer:', !!answer);

    const acceptAnswer: boolean = await initiator.acceptAnswer(answer);
    console.log('Answer was accepted by initiator:', acceptAnswer);

    await remoteClient.answerWasAccepted(acceptAnswer);
};
