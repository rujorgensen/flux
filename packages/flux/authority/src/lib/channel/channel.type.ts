import type { TChannelName } from '@flux/shared/types';

/**
 * Callback function to authorize a channel connection.
 * 
 * @param { TChannelName }  channelName - the topic to subscribe to
 * @param { unknown }       identification - whatever identification the authority requires
 * 
 * @returns { Promise<boolean> } - true if the channel connection is authorized, false otherwise
 */
export type TChannnelAuthCallback<T> = (
    channelName: TChannelName,
    identification: T,
) => Promise<boolean>;

