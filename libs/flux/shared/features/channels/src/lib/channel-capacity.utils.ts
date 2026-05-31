import type {
    TSubscription_S,
} from '@flux/shared/types';

export const MAX_CHANNEL_MEMBERS_BY_SUBSCRIPTION_TYPE: {
    [key in TSubscription_S]: number
} = {
    free: 25,
    medium: 500,
    high: 100_000,
} as const;

export const MAX_CHANNEL_MEMBERS = MAX_CHANNEL_MEMBERS_BY_SUBSCRIPTION_TYPE.high;
