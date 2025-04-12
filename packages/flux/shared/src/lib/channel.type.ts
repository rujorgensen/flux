export type TChannelTopic = string & { __brand: 'channel-topic'; };

export const validateTopic = (
    topic: string,
): topic is TChannelTopic => {
    if (topic.includes(':')) {
        throw new Error('Topic cannot contain :');
    }

    return true;
};