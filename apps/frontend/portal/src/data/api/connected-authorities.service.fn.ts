import { app } from "../api";

export const readConnectedAuthorityCount = async (
    networkId: string,
) => {
    const { data } = await app.api
        .networks({
            networkId,
        })["connected-authorities"].get();

    return data;
};