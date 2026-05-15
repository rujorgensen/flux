import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma-types/flux';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env['FLUX_MASTER_PASSWORD']) {
    if (!process.env['GOOGLE_CLIENT_ID']) {
        throw new Error('GOOGLE_CLIENT_ID is not set in environment variables');
    }

    if (!process.env['GOOGLE_CLIENT_SECRET']) {
        throw new Error('GOOGLE_CLIENT_SECRET is not set in environment variables');
    }
} else {
    console.log(`Master password login enabled.`);
}

if (!process.env['FLUX_DATABASE_URL']) {
    throw new Error('FLUX_DATABASE_URL is not set in environment variables');
}

const FLUX_DATABASE_URL: string = process.env['FLUX_DATABASE_URL'];

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: FLUX_DATABASE_URL,
    }),
});

/**
 * ! If changing this configuration, make sure to run `bun auth:generate` to apply the changes.
 */
export const auth = betterAuth({
    telemetry: {
        enabled: false,
    },
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    user: {
        additionalFields: {
            isFluxAdmin: {
                type: 'boolean',
                required: false,
                defaultValue: false,
                input: false,
            },
        },
    },
    trustedOrigins: [
        'http://localhost:3001',
        'http://localhost:9000',
    ],
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env['GOOGLE_CLIENT_ID'] ?? '-',
            clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '-',
        },
    },
});