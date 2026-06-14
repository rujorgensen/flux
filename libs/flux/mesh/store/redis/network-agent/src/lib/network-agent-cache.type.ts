import type {
    TAddress,
    TAgentOwnUId,
    TClientId,
} from '@flux/shared/types';

export type TNetworkAgent = {
    id: TClientId;
    uid?: TAgentOwnUId;
    ip: string | null;
    address: TAddress;
    bytes: number;
    packets: number;
    connectedAt: Date;
};