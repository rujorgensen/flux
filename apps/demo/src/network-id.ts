import type { TNetworkId_S } from '@flux/shared/types';

export const DEFAULT_NETWORK_ID: string = 'demo-network-id';

const STORAGE_KEY = 'flux_network_id';

export const getNetworkId = (): TNetworkId_S =>
    (localStorage.getItem(STORAGE_KEY) ?? DEFAULT_NETWORK_ID) as TNetworkId_S;

export const setNetworkId = (
    networkId: string,
): void => {
    if (!networkId.trim()) {
        throw new Error('Network ID cannot be empty');
    }
    localStorage.setItem(STORAGE_KEY, networkId.trim());
};
