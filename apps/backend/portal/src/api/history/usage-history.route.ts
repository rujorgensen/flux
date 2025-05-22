/**
 * Module for retrieving usage history data
 */

import type {
    TNetworkId_S,
} from '@flux/shared/types';
import type {
    PrismaClient,
} from '@prisma-types/flux';

/**
 * Creates a function to read usage history
 * 
 * @param portalPgRepository Prisma client for database access
 * @returns Function that retrieves usage history for a network within a date interval
 */
export const readUsageHistory = (
    portalPgRepository: PrismaClient,
) => {
    /**
     * Reads usage history for a specific network and date range
     * 
     * @param networkId Network identifier
     * @param dateInterval Object containing from and to dates
     * @param dateInterval.from Start date for history query
     * @param dateInterval.to End date for history query
     * @returns Usage history data (implementation pending)
     */
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