import type { TNetworkId_S } from '@flux/shared/types';
import { writable } from 'svelte/store';

export type Network = {
    networkId: TNetworkId_S;
    name: string;
    logo: any;
    plan: string;
};

export const activeNetwork = writable<Network | null>(null);
