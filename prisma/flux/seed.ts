import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../@prisma-types/flux/client';
import { nanoid } from 'nanoid';

const FLUX_DATABASE_URL = Bun.env['FLUX_DATABASE_URL'];

if (!FLUX_DATABASE_URL) {
    throw new Error('FLUX_DATABASE_URL is not set in environment variables');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: FLUX_DATABASE_URL,
    }),
});

const SEEDED_USER_EMAIL = 'dev@flux.local';
const SEEDED_USER_NAME = 'Flux Developer';
const MAIN_NETWORK_ID = 'dev-network';
const EMPTY_NETWORK_ID = 'empty-network';

/**
 * Builds a 24-point series with smooth variation, used for local development
 * seed data so charts are populated with realistic-looking trends.
 */
function generateHistoryCounts(
    base: number,
    variation: number,
): number[] {
    return Array.from({ length: 24 }, (_, index) => {
        const wave = Math.sin(index / 3) * variation;
        const trend = index > 16 ? (index - 16) * 0.8 : 0;
        return Math.max(0, Math.round(base + wave + trend));
    });
}

async function ensureNetworkMembership(
    userId: string,
    networkId: string,
) {
    const existing = await prisma.userNetwork.findFirst({
        where: {
            userId,
            networkId,
        },
        select: {
            id: true,
        },
    });

    if (existing) {
        return;
    }

    await prisma.userNetwork.create({
        data: {
            userId,
            networkId,
            role: 'ADMIN',
        },
    });
}

async function seed() {
    const now = new Date();
    const seededUser = await prisma.user.upsert({
        where: {
            email: SEEDED_USER_EMAIL,
        },
        update: {
            name: SEEDED_USER_NAME,
            updatedAt: now,
        },
        create: {
            id: `dev-user-${nanoid(6)}`,
            email: SEEDED_USER_EMAIL,
            name: SEEDED_USER_NAME,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
            image: null,
        },
    });

    await prisma.network.upsert({
        where: {
            id: MAIN_NETWORK_ID,
        },
        update: {
            alias: 'Development Network',
        },
        create: {
            id: MAIN_NETWORK_ID,
            alias: 'Development Network',
        },
    });

    await prisma.network.upsert({
        where: {
            id: EMPTY_NETWORK_ID,
        },
        update: {
            alias: 'Empty Network',
        },
        create: {
            id: EMPTY_NETWORK_ID,
            alias: 'Empty Network',
        },
    });

    await ensureNetworkMembership(seededUser.id, MAIN_NETWORK_ID);
    await ensureNetworkMembership(seededUser.id, EMPTY_NETWORK_ID);

    const timestamps = Array.from({ length: 24 }, (_, index) => new Date(now.getTime() - (23 - index) * 60 * 60 * 1000));
    const agents = generateHistoryCounts(6, 3);
    const authorities = generateHistoryCounts(3, 2);
    const channels = generateHistoryCounts(15, 8);
    const usageKb = generateHistoryCounts(1800, 700);

    await prisma.connectedAgentsHistory.deleteMany({
        where: {
            networkId: MAIN_NETWORK_ID,
        },
    });
    await prisma.connectedAuthoritiesHistory.deleteMany({
        where: {
            networkId: MAIN_NETWORK_ID,
        },
    });
    await prisma.channelsHistory.deleteMany({
        where: {
            networkId: MAIN_NETWORK_ID,
        },
    });
    await prisma.usageHistory.deleteMany({
        where: {
            networkId: MAIN_NETWORK_ID,
        },
    });

    await prisma.connectedAgentsHistory.createMany({
        data: timestamps.map((timeslotAt, index) => ({
            networkId: MAIN_NETWORK_ID,
            count: agents[index],
            timeslotAt,
        })),
    });

    await prisma.connectedAuthoritiesHistory.createMany({
        data: timestamps.map((timeslotAt, index) => ({
            networkId: MAIN_NETWORK_ID,
            count: authorities[index],
            timeslotAt,
        })),
    });

    await prisma.channelsHistory.createMany({
        data: timestamps.map((timeslotAt, index) => ({
            networkId: MAIN_NETWORK_ID,
            count: channels[index],
            timeslotAt,
        })),
    });

    await prisma.usageHistory.createMany({
        data: timestamps.map((timeslotAt, index) => ({
            networkId: MAIN_NETWORK_ID,
            usageKb: usageKb[index],
            timeslotAt,
        })),
    });

    console.log('Seed complete');
    console.log(`User: ${SEEDED_USER_EMAIL}`);
    console.log(`Networks: ${MAIN_NETWORK_ID}, ${EMPTY_NETWORK_ID}`);
}

await seed()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
