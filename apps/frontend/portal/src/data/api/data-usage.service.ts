import { app } from "../api";

export const readTotalNetworkDataUsage = async (
    networkId: string,
) => {
    const { data } = await app.api
        .networks({
            networkId,
        })["data-usage"].get();

    return data;
};