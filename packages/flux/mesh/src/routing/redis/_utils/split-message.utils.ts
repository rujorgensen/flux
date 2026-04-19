import type {
    TClientId,
    TChannelName,
    TProcessAddress,
} from '@flux/shared/types';

// {TProcessAddress}:nc-on-pub:{clientId}:{channelName}:{data}
export type TMessageConstruct = `${TProcessAddress}:nc-on-pub:${TClientId}:${TChannelName}:${string}`;

export interface ISplitMessageResult {
    clientId: TClientId;
    channelName: TChannelName;
    data: string;
}

/**
 * Splits a raw message string into its components: clientId, channelName, and data.
 */
export const splitOrThrowMessage = (
    rawMessage: TMessageConstruct,
): ISplitMessageResult => {

    const count = (rawMessage.match(/:/g) || []).length;

    if (count < 4) {
        throw new Error(`Invalid message format. Expected at least 4 colons, got ${count}.`);
    }

    // Split the string by ':'
    const parts: string[] = rawMessage.split(':');

    // Ignore processAddress and internalChannel.
    parts.shift();
    parts.shift();

    return {
        clientId: parts.shift() as TClientId,
        channelName: parts.shift() as TChannelName,
        data: parts.join(':'), // Rejoin the message in case it contained colons
    };
};