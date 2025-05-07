import { Elysia, error, t } from 'elysia';
// import { $ } from 'bun';
import jwt from '@elysiajs/jwt';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { RedisStatusService } from './_services/redis-status.service';
import { BunRedisClient } from '@core/redis/bun';
import { LiveUpdates } from './live-updates.class';

// ****************************************************************************
// * Env
// ****************************************************************************
const AUTHORITY_JWT_SECRET: string | undefined = process.env.FLUX_AUTHORITY_JWT_SECRET;
if (!AUTHORITY_JWT_SECRET) {
    throw new Error('Missing FLUX_AUTHORITY_JWT_SECRET in .env');
}

const FLUX_MESH_REDIS_URL: string | undefined = process.env.FLUX_MESH_REDIS_URL;

if (!FLUX_MESH_REDIS_URL) {
    throw new Error('Missing FLUX_MESH_REDIS_URL in .env');
}

const FLUX_PORTAL_REDIS_URL: string | undefined = process.env.FLUX_PORTAL_REDIS_URL;

if (!FLUX_PORTAL_REDIS_URL) {
    throw new Error('Missing FLUX_PORTAL_REDIS_URL in .env');
}

// ****************************************************************************
// * Connections to Stores
// ****************************************************************************

// * Connect to Redis
const meshRedis: BunRedisClient = new BunRedisClient({
    url: FLUX_MESH_REDIS_URL,
    socket: {
        reconnectStrategy: (
            retries: number,
        ) => {
            console.warn(`🔄 Redis reconnection attempt #${retries}`);

            // Backoff in ms
            return Math.min(retries * 100, 3_000);
        },
    },
});

const portalRedis: BunRedisClient = new BunRedisClient({
    url: FLUX_PORTAL_REDIS_URL,
    socket: {
        reconnectStrategy: (
            retries: number,
        ) => {
            console.warn(`🔄 Redis reconnection attempt #${retries}`);

            // Backoff in ms
            return Math.min(retries * 100, 3_000);
        },
    },
});

await Promise.all([meshRedis.connect(), portalRedis.connect()]);

if (!meshRedis.connected && !portalRedis.connected) {
    console.error('❌ Both Redis connections failed, will retry');
} else if (!meshRedis.connected) {
    console.error('❌ Mesh Redis connection failed, will retry');
} else if (!portalRedis.connected) {
    console.error('❌ Portal Redis connection failed, will retry');
} else {
    console.log('✅ Redis connected');
}

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
    AUTHORITY_JWT_SECRET,
);

const proxy = async ({ request }: {
    request: Bun.BunRequest,
}) => {
    const original = new URL(request.url);

    const proxyUrl = `http://localhost:3001${original.pathname}`;

    return await fetch(proxyUrl, {
        headers: request.headers,
    });
};

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
const app = new Elysia()
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
        origin: 'localhost:4321',
        methods: ['GET'],
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
            return error(401, 'Unauthorized');
        }

        auth?.set({
            value,
            // httpOnly: true,
            maxAge: 7 * 86400,
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

    // * Proxy all other requests to the frontend server
    .get('/*', proxy, {
        beforeHandle({ set, cookie: { session }, error }) {
            console.log('validate');
            // if (!validateSession(session.value)) return error(401)
        }
    })

    .listen(3_000)
    ;

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;