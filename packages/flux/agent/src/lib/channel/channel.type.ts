import type { TChannelName } from '@flux/shared/types';

/**
 * Callback function to authorize a channel connection.
 * Returns true if the channel connection is authorized, false otherwise.
 */
export type TChannnelAuthCallback<T> = (
    channelTopic: TChannelName,
    identification: T,
) => Promise<boolean>;

