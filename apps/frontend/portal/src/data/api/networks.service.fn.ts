import type { INetwork_S } from "apps/backend/portal/src/repository/network.repository";
import { app } from "../api";

export const createNetwork = async (
    alias: string,
): Promise<INetwork_S> => {
    const { data } = await app.api
        .networks
        .post({
            alias,
        });

    if (!data) {
        throw new Error("Failed to create network");
    }

    return data;
};
