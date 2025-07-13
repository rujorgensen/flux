import { type Context, Elysia } from 'elysia';
import { auth } from '@backend/portal/auth';
// import { $ } from 'bun';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { RedisStatusService } from './_services/redis-status.service';
import { LiveUpdates } from './live-updates.class';
import { networkChannelRoutes } from './api/networks/networks-channels.route';
import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import { getPortalRedisConnection } from '@flux/portal/core/redis';
import { networkAuthorityRoutes } from './api/networks/authorities.route';
import { networkAgentRoutes } from './api/networks/agents.route';

// ****************************************************************************
// * Env
// ****************************************************************************
const FLUX_AUTHORITY_JWT_SECRET: string | undefined = process.env.FLUX_AUTHORITY_JWT_SECRET;
if (!FLUX_AUTHORITY_JWT_SECRET) {
    throw new Error('Missing FLUX_AUTHORITY_JWT_SECRET in .env');
}

// ****************************************************************************
// * Connections to Stores
// ****************************************************************************
const portalRedis = await getPortalRedisConnection();
const meshRedis = await getMeshBunRedisConnection();

// ****************************************************************************
// * Setup Services
// ****************************************************************************
const portalRedisStatusService: RedisStatusService = new RedisStatusService(portalRedis);
const meshRedisStatusService: RedisStatusService = new RedisStatusService(meshRedis);

// ****************************************************************************
// * Start server
// ****************************************************************************

new LiveUpdates(
    portalRedisStatusService,
    meshRedisStatusService,
    FLUX_AUTHORITY_JWT_SECRET,
);

// * Host the frontend and static resources 
// try {
//   $`HOST=0.0.0.0 PORT=3001 bunx run ../../../dist/apps/frontend/portal/server/entry.mjs`
//     .then(() => {
//       console.log('Frontend server started on port 3001');
//     })
//     ;
// } catch {
//   // console.error('Server might be runnning');
// }

// user middleware (compute user and session and pass to routes)
const betterAuth = new Elysia({ name: 'better-auth' })
    .all('/api/auth/*', (context: Context) => {
        if (['POST', 'GET'].includes(context.request.method)) {
            return auth.handler(context.request);
        }

        context.status(405);
    })

    .macro({
        auth: {
            async resolve({ status, request: { headers } }) {
                const session = await auth.api.getSession({
                    headers,
                });

                if (!session) {
                    return status(401);
                }

                return {
                    user: session.user,
                    session: session.session,
                };
            },
        },
    });

// * Host the api
export const app = new Elysia()

    //  .use(rateLimiter)
    //  .onRequest(({ rateLimiter, ip, set, error }) => {
    //      if (rateLimiter.check(ip)) return error(420, 'Enhance your calm')
    //  })

    // .onBeforeHandle(() => {
    //   console.log('onBeforeHandle')
    // })

    .use(cors(Bun.env.NODE_ENV === 'production' ? undefined : {
        origin: 'localhost:3001',
        methods: [
            'GET',
            'POST',
        ],
    }))

    .use(swagger({
        path: '/api/docs',
    }))

    // User middleware (compute user and session and pass to routes)
    .use(betterAuth)

    .onRequest(({ request }) => {
        const { method, url } = request;
        const path = new URL(url).pathname;

        console.log(`Received request: [${method}] ${path}`);
    })

    .get('/api/ping', () => 'pong')
    .use(networkAuthorityRoutes)
    .use(networkAgentRoutes)
    .use(networkChannelRoutes)
    .get('/api/status', () => {
        return [
            meshRedisStatusService.getRedisStatusOrThrow(),
            portalRedisStatusService.getRedisStatusOrThrow(),
        ];
    })

    // return new Response(null, {
    //   status: 303,
    //   headers: {
    //     Location: '/',
    //   }
    // })
    // .get('/profile', async ({ jwt, error, cookie: { auth } }) => {
    //   const profile = await jwt.verify(auth?.value)

    //   if (!profile)

    //   return `Hello ${profile.name}`
    // })

    .listen(3_000)
    ;

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;