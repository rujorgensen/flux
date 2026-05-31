import type {
    TNetworkId_S,
    TSubscription_S,
} from '@flux/shared/types';

export interface INetwork_S {
    id: TNetworkId_S;
    alias: string;
    subscription: TSubscription_S;
    users: {
        userId: string;
        role: string;
    }[];
}