import { app } from "../api";
import type {
    TNetworkAgentCountAt,
} from '@flux/shared/types';

export const readConnectedAgentCount = async (
    networkId: string,
): Promise<TNetworkAgentCountAt | null> => {
    try {
        const { data } = await app.api
            .networks({
                networkId,
            })
            .agents
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