import type {
    TAddress,
    TClientId,
} from '@flux/shared/types';

export type TNetworkAuthority = {
    id: TClientId;
    connectedAt: Date;
    address: TAddress;
};

export type TNetworkAuthorityCountAt = {
    count: number;
    date: Date;
};
