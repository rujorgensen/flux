import { app } from "../api";

export const readChannelCount = async (
    networkId: string,
) => {
    const { data } = await app.api
        .networks({
            networkId,
        })["channels"].get();

    return data;
};