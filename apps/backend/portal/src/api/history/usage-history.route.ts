/**
 * 
 */

import type {
    TNetworkId_S,
} from '@flux/shared/types';
import type {
    PrismaClient,
} from '@prisma-types/flux';

export const readUsageHistory = (
    portalPgRepository: PrismaClient,
) => {
    return (
        networkId: TNetworkId_S,
        dateInterval: {
            from: Date,
            to: Date,
        },
    ) => {
        // Read from cache
        // // return portalPgRepository
        // //     .usageHistory
        // //     .findMany({
        // //         where: {
        // //             networkId,
        // //             at: {
        // //                 lte: dateInterval.to,
        // //             },
        // //         },
        // //     });
    };
};