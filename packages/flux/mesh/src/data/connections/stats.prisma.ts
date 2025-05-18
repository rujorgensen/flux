/*
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// create a new user
await prisma.user.create({
    data: {
        name: 'John Dough',
        email: `john-${Math.random()}@example.com`,
    },
});

// count the number of users
const count = await prisma.user.count();
console.log(`There are ${count} users in the database.`);
 */

let prismaConnection: StatsPrismaConnection | undefined;

// const FLUX_STATS_SQL_URL: string | undefined = process.env['FLUX_STATS_SQL_URL'];

// if (!FLUX_STATS_SQL_URL) {
//     throw new Error('Missing FLUX_STATS_SQL_URL in .env');
// }

/**
 * Singleton function to get the Redis connection
 *
 * @returns
 */
export const getStatsPrismaConnection = () => {
    prismaConnection ??= new StatsPrismaConnection();

    return prismaConnection;
};


export class StatsPrismaConnection {
    // private readonly _prismaClient: PrismaClient;

    constructor(

    ) {
       //  this._prismaClient = new PrismaClient();
    }
}