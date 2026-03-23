import type { TChannelName } from '@flux/shared/types';

/**
 * Callback function to authorize a channel connection.
 * 
 * @param { TChannelName } channelName - The channel name to authorize
 * @param { T } identification - Whatever identification the authority requires
 * 
 * @returns { Promise<boolean> } True if the channel connection is authorized, false otherwise
 */
export type TChannnelAuthCallback<T> = (
    channelName: TChannelName,
    identification: T,
) => Promise<boolean>;

