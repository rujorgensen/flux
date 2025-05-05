import type { TClientId } from '@flux/shared/types';

export type TNetworkAgent = {
    id: TClientId;
    ip: string | null;
    address: string;
    bytes: number;
    packets: number;
};