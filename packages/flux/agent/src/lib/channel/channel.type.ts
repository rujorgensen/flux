import type { TChannelName } from '@flux/shared/types';

/**
 * Callback function to authorize a channel connection.
 * 
 * @param { TChannelName } channelTopic - The channel topic to subscribe to
 * @param { T } identification - Whatever identification the authority requires
 * 
 * @returns { Promise<boolean> } True if the channel connection is authorized, false otherwise
 */
export type TChannnelAuthCallback<T> = (
    channelTopic: TChannelName,
    identification: T,
) => Promise<boolean>;

