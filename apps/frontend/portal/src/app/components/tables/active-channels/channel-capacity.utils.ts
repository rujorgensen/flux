import {
    type TSubscription_S,
    MAX_CHANNEL_MEMBERS_BY_SUBSCRIPTION_TYPE,
} from '@flux/shared/types';

/**
 * Calculates the current channel capacity fill as a percentage.
 * Returns a clamped value between 0 and 100 based on MAX_CHANNEL_MEMBERS_BY_SUBSCRIPTION_TYPE.
 */
export const deriveChannelFillPercent = (
    subscription: TSubscription_S,
    members: number,
): number => {
    if (members <= 0) {
        return 0;
    }

    if (members >= MAX_CHANNEL_MEMBERS_BY_SUBSCRIPTION_TYPE[subscription]) {
        return 100;
    }

    return (members / MAX_CHANNEL_MEMBERS_BY_SUBSCRIPTION_TYPE[subscription]) * 100;
};
