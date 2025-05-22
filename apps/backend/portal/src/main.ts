import { Elysia, status, t } from 'elysia';
// import { $ } from 'bun';
import jwt from '@elysiajs/jwt';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { RedisStatusService } from './_services/redis-status.service';
import { LiveUpdates } from './live-updates.class';
import {
    networkAgentRoutes,
    networkChannelRoutes,
} from './api/networks/networks.route';
import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import { getPortalRedisConnection } from '@flux/portal/core/redis';
import { networkAuthorityRoutes } from './api/networks/authorities/authorities.route';

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

// * Host the api
export const app = new Elysia()
    .use(
        jwt({
            name: 'jwt',
            secret: 'Fischl von Luftschloss Narfidort'
        }),
    )

    //  .use(rateLimiter)
    //  .onRequest(({ rateLimiter, ip, set, error }) => {
    //      if (rateLimiter.check(ip)) return error(420, 'Enhance your calm')
    //  })

    // .onBeforeHandle(() => {
    //   console.log('onBeforeHandle')
    // })

    .use(cors({
        origin: 'http://localhost:3001',
        methods: ['GET', 'POST'],
    }))

    .use(swagger({
        path: '/api/docs',
    }))

    .onRequest(({ request }) => {
        const { method, url } = request;
        const path = new URL(url).pathname;

        console.log(`Received request: [${method}] ${path}`);
    })

    .get('/api/ping', () => 'pong')
    .use(networkAuthorityRoutes)
    .use(networkAgentRoutes)
    .use(networkChannelRoutes)
    .get('/api/connected-authorities', () => 9999)
    .get('/api/status', () => {
        return [
            meshRedisStatusService.getRedisStatusOrThrow(),
            portalRedisStatusService.getRedisStatusOrThrow(),
        ];
    })

    .post('/auth', async ({ jwt, query, cookie: { auth }, body, redirect }) => {

        console.log('BODY', { pass: body.password });

        // Check if the user is already authenticated
        const value = await jwt.sign({ token: query.token as string });

        if (!body.password) {
            return status(401);
        }

        auth?.set({
            value,
            // httpOnly: true,
            maxAge: 7 * 86_400,
            path: '/',
        });

        return redirect('/', 303);
    },
        {
            body: t.Object({
                password: t.String()
            })
        }
    )

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