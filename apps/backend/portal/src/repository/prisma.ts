import { PrismaClient } from '@prisma-types/flux';
import { PrismaPg } from '@prisma/adapter-pg';

let prisma: PrismaClient | undefined;

if (!Bun.env['FLUX_DATABASE_URL']) {
    throw new Error('FLUX_DATABASE_URL is not set in environment variables');
}

const FLUX_DATABASE_URL: string = Bun.env['FLUX_DATABASE_URL'];

export const getPortalPgRepository = (

): PrismaClient => {
    prisma ??= new PrismaClient({
        adapter: new PrismaPg({
            connectionString: FLUX_DATABASE_URL,
        }),
    });

    return prisma;
};

// create a new user
// await prisma.user.create({
//     data: {
//         name: 'John Dough',
//         email: `john-${Math.random()}@example.com`,
//     },
// });

// // count the number of users
// const count = await prisma.user.count();
// console.log(`There are ${count} users in the database.`);