import { Elysia } from 'elysia';
// import { $ } from 'bun';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { RedisStatusService } from './_services/redis-status.service';
import { LiveUpdates } from './live-updates.class';
import { networkChannelController } from './api/networks/networks-channels.controller';
import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import { getPortalRedisConnection } from '@flux/portal/core/redis';
import { networkAuthorityController } from './api/networks/authorities.controller';
import { networkAgentController } from './api/networks/agents.controller';
import { betterAuth } from './_decorators/auth.decorator';
import { networksController } from './api/networks/networks.controller';
import { version } from '../package.json';
import { networkTokenController } from './api/networks/tokens/tokens.controller';

// ****************************************************************************
// * Env
// ****************************************************************************
const FLUX_AUTHORITY_JWT_SECRET: string | undefined = process.env['FLUX_AUTHORITY_JWT_SECRET'];
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

const fluxMeshServerPort: number = Bun.env['PORTAL_MESH_SERVER_PORT'] ?
    Number.parseInt(Bun.env['PORTAL_MESH_SERVER_PORT'])
    :
    5_101;

new LiveUpdates(
    fluxMeshServerPort,
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
            'DELETE',
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
    .use(networkAuthorityController)
    .use(networkAgentController)
    .use(networkChannelController)
    .use(networksController)
    .use(networkTokenController)

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

    .onStart(({ server }) => {
        console.log(`🦊. Elysia API server v. ${version} is running at ${server?.hostname}:${server?.port}`);
    })

    .listen(Bun.env['PORT'] ?? 3_000)
    ;

export type TApp = typeof app;