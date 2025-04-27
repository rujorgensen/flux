import { PrismaClient } from '@prisma-types/flux';

let prisma: PrismaClient | undefined;

export const getPortalPgRepository = (

): PrismaClient => {
    prisma ??= new PrismaClient();

    return prisma;
}

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