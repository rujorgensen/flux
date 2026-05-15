import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma-types/flux';
import { PrismaPg } from '@prisma/adapter-pg';

export const MASTER_PASSWORD_ADMIN_EMAIL = 'admin@admin.com';
export const isMasterPasswordLoginEnabled = Boolean(process.env['FLUX_MASTER_PASSWORD']);

if (!isMasterPasswordLoginEnabled) {
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
        ...((process.env['CUSTOM_TRUSTED_ORIGINS'] || undefined)?.split(',') ?? []),
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

// * Create master user, if masterpassword is set, and running as self-hosted
if (process.env['FLUX_MASTER_PASSWORD']) {

    const MASTER_PASSWORD = process.env['FLUX_MASTER_PASSWORD'];
    if (MASTER_PASSWORD.length < 8) {
        throw new Error('FLUX_MASTER_PASSWORD was set, must be a string with at least 8 characters.');
    }

    if (MASTER_PASSWORD.length > 128) {
        throw new Error('FLUX_MASTER_PASSWORD was set, must be a string with at most 128 characters.');
    }

    console.log('FLUX_MASTER_PASSWORD detected in env, attempting to create admin user with email admin@admin.com');
    try {
        const data = await auth.api.signUpEmail({
            body: {
                name: 'Administrator',
                email: MASTER_PASSWORD_ADMIN_EMAIL,
                password: MASTER_PASSWORD,
            },
        });

        console.log('Admin user created:', data.user);
    } catch {
        console.warn('Admin user already exists, skipping creation.');
    }
} else {
    console.log('FLUX_MASTER_PASSWORD not set, skipping admin user creation.');
}
