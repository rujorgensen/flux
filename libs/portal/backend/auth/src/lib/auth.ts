import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma-types/flux';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env['GOOGLE_CLIENT_ID']) {
    throw new Error('GOOGLE_CLIENT_ID is not set in environment variables');
}

if (!process.env['GOOGLE_CLIENT_SECRET']) {
    throw new Error('GOOGLE_CLIENT_SECRET is not set in environment variables');
}

if (!Bun.env['FLUX_DATABASE_URL']) {
    throw new Error('FLUX_DATABASE_URL is not set in environment variables');
}

const FLUX_DATABASE_URL: string = Bun.env['FLUX_DATABASE_URL'];

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: FLUX_DATABASE_URL,
    }),
});

export const auth = betterAuth({
    telemetry: {
        enabled: false,
    },
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    trustedOrigins: [
        'http://localhost:3001',
    ],
    socialProviders: {
        google: {
            clientId: process.env['GOOGLE_CLIENT_ID'] as string,
            clientSecret: process.env['GOOGLE_CLIENT_SECRET'] as string,
        },
    },
});