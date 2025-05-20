import type { TAgentOwnUId, TClientId } from '@flux/shared/types';

export type TNetworkAgent = {
    id: TClientId;
    uid?: TAgentOwnUId;
    ip: string | null;
    address: string;
    bytes: number;
    packets: number;
};