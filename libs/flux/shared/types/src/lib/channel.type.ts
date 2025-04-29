export type TChannelName = string & { __brand: 'channel-name'; };

/**
 * Validates a channel name and throws an error if it is invalid.
 * 
 * @param { string } channelName
 * 
 * @returns { boolean }
 */
export const validateChannelNameOrThrow = (
    channelName: string,
): channelName is TChannelName => {
    if (channelName.includes(':')) {
        throw new Error('Channel name cannot contain :');
    }

    if (channelName.includes('/')) {
        throw new Error('Channel name cannot contain /');
    }

    if (!/^[A-Za-z0-9-]+$/.test(channelName)) {
        throw new Error('Channel name can only contain letters, numbers and dashes (\'-\')');
    }

    if (channelName.length > 100) {
        throw new Error('Channel name cannot be longer than 100 characters');
    }

    return true;
};