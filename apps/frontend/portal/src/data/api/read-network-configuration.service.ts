import { app } from "../api";

export const readNetworkConfiguration = async (
    networkId: string,
) => {
    const { data } = await app
        .api
        .networks({
            networkId,
        })
        .configuration
        .get()
        ;

    return {
        ...data,
        memberSince: new Date(data.memberSince),
    };
};