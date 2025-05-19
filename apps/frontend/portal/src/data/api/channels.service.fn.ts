import { app } from "../api";

export const readChannelCount = async (
    networkId: string,
) => {
    const { data } = await app.api
        .networks({
            networkId,
        })
        .channels
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
};