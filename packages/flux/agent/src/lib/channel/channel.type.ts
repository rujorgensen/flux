import { TChannelTopic } from "@flux/shared";

/**
 * Callback function to authorize a channel connection.
 * 
 * @param { TChannelTopic }     channelTopic - the topic to subscribe to
 * @param { unknown }           identification - whatever identification the authority requires
 * 
 * @returns { Promise<boolean> } - true if the channel connection is authorized, false otherwise
 */
export type TChannnelAuthCallback<T> = (
    channelTopic: TChannelTopic,
    identification: T,
) => Promise<boolean>;

