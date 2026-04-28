import type { PrismaConfig } from 'prisma';

export default {
    schema: 'schema.prisma',
    migrations: {
        path: 'migrations',
        seed: "bun run prisma/flux/seed.ts",
    },
    datasource: {
        url: Bun.env['FLUX_DATABASE_URL'],
    },
} satisfies PrismaConfig;
