import { TChannelName } from '@flux/shared/types';

// {processAddress}:nc-on-pub:{agentId}:{channelName}:{data}
type TProcessAddress = string & { __brand: 'TProcessAddress'; };
type TAgentId = string & { __brand: 'TAgentId'; };
export type TMessageConstruct = `${TProcessAddress}:nc-on-pub:${TAgentId}:${TChannelName}:${string}`;

export interface ISplitMessageResult {
    agentId: TAgentId;
    channelName: TChannelName;
    data: string;
}

/**
 * Splits a raw message string into its components: agentId, channelName, and data.
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
        agentId: parts.shift() as TAgentId,
        channelName: parts.shift() as TChannelName,
        data: parts.join(':'), // Rejoin the message in case it contained colons
    };
};