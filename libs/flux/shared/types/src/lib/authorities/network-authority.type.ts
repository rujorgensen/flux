import type { TClientId } from '@flux/shared/types';

export type TNetworkAuthority = {
    id: TClientId;
    connectedAt: Date;
};

export type TNetworkAuthorityCountAt = {
    count: number;
    date: Date;
};
