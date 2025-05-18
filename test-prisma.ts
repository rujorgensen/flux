import { PrismaClient } from '@prisma-types/flux';

let prisma: PrismaClient | undefined;

export const getPortalPgRepository = (

): PrismaClient => {
    prisma ??= new PrismaClient();

    return prisma;
}

// // create a new user
// await getPortalPgRepository().user.create({
//     data: {
//         email: `john-${Math.random()}@example.com`,
//     },
// });

// // count the number of users
// const count = await getPortalPgRepository().user.count();

// console.log(`There are ${count} users in the database.`);

// const user = await getPortalPgRepository().user.findFirst({
//     where: {
//         email: 'rujorgensen@gmail.com',
//     },
// });
// console.log(`Found user matching:`, JSON.stringify(user));