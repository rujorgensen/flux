import type {
    TNetworkId_S,
} from '@flux/shared/types';
import type {
    PrismaClient,
} from '@prisma-types/flux';

export const readChannelHistory = (
    portalPgRepository: PrismaClient,
) => {
    return (
        networkId: TNetworkId_S,
        dateInterval: {
            from: Date,
            to: Date,
        },
    ) => {

    };
};