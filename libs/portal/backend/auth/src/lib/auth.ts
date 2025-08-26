import { betterAuth } from 'better-auth';
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma-types/flux";

const prisma = new PrismaClient();

export const auth = betterAuth({
    telemetry: {
        enabled: false,
    },
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    trustedOrigins: [
        "http://localhost:3001",
    ],
    socialProviders: {
        google: {
            clientId: process.env['GOOGLE_CLIENT_ID'] as string,
            clientSecret: process.env['GOOGLE_CLIENT_SECRET'] as string,
        },
    },
});