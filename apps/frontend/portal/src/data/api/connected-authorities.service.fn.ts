import { app } from "../api";
import type {
    TNetworkAuthorityCountAt,
} from '@flux/shared/types';

export const readConnectedAuthoritiesCount = async (
    networkId: string,
): Promise<TNetworkAuthorityCountAt | null> => {
    try {
        const { data } = await app.api
            .networks({
                networkId,
            })
            .authorities
            .count
            .get({
                query: {
                    when: 'now',
                },
            });

        return data ? {
            ...data,
            date: new Date(data.date),
        } : null;

    } catch {
        return null;
    }
};