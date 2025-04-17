import { Elysia, error, t } from 'elysia';
// import { $ } from 'bun';
import jwt from '@elysiajs/jwt';
import { FluxMeshServer } from '@flux/mesh';
import { FluxAuthority } from '@persistica/flux-authority';
import * as jjwt from 'jsonwebtoken';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { FluxAgent } from '@persistica/flux-agent';
import type { FluxNetworkConnection } from '@flux/shared/connection';

if (!process.env['FLUX_AUTHORITY_JWT_SECRET']) {
  throw new Error('Missing FLUX_AUTHORITY_JWT_SECRET in .env');
}

const AUTHORITY_JWT_SECRET: string = process.env['FLUX_AUTHORITY_JWT_SECRET'];

// ****************************************************************************
// * Setup Mesh Server
// ****************************************************************************
const fluxMeshServer: FluxMeshServer = new FluxMeshServer();

fluxMeshServer.onReady(async () => {

  // ****************************************************************************
  // * Setup Authority
  // ****************************************************************************

  console.log('🔑 Registering authority');

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const CODE_TO_ACCESS_NETWORK: any = 'code-to-access-network'; // Key to connect to a network, unknown and irelevant to flux
  const NETWORK_AUTHORITY_KEY: string = 'network-authority-key'; // Key to register an authority, known to flux

  const fluxAuthority = new FluxAuthority(
    'network-id',
    {
      //         domain?: string,
      //         secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
      //         retries?: number; // Number of times to retry a failed message
    },
  );

  await fluxAuthority
    .registerAuthority(
      NETWORK_AUTHORITY_KEY,
      (
        auth: unknown,
      ): Promise<string> => {
        console.log('🔑 A client is trying to access the network', auth);

        // Test the agents claim to access network
        if (
          (auth !== CODE_TO_ACCESS_NETWORK)
        ) {
          return Promise.reject('Not allowed');
        }

        // console.log('✅ Network access authorized');

        return Promise.resolve(jjwt.sign({
          userId: (<any>auth).user,
        }, AUTHORITY_JWT_SECRET, { expiresIn: 120_000 }));
      },

      (
        channelTopic: string,
        identification: string,
      ): Promise<boolean> => {

        console.log(`🔒 A client is trying to subscribe to topic '${channelTopic}', using identification '${identification}'`);

        console.log(`✅ Client suscribed to channel with topic '${channelTopic}'`);

        return Promise.resolve(true);
      },
    );

  // ****************************************************************************
  // * Setup Agent
  // ****************************************************************************


  const fluxAgent = new FluxAgent(
    'network-id',
    {
      //         domain?: string,
      //         secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
      //         retries?: number; // Number of times to retry a failed message
    },
  );

  const fluxNetworkConnection: FluxNetworkConnection = await fluxAgent
    .connect(
      CODE_TO_ACCESS_NETWORK,
      'backend-agent',
    );

  console.log(`✅ Agent connected to network ID: "${fluxNetworkConnection.id}"`);
});



// ****************************************************************************
// * Start server
// ****************************************************************************

// make TypeScript happy
// declare global {
//   var count: number;
// }

// globalThis.count ??= 0;
// console.log(`Reloaded ${globalThis.count} times`);
// globalThis.count++;

const proxy = async ({ request }: {
  request: Bun.BunRequest,
}) => {
  const original = new URL(request.url);


  const proxyUrl = `http://localhost:3001${original.pathname}`;

  return await fetch(proxyUrl, {
    headers: request.headers,
  });

}


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
    })
  )

  //  .use(rateLimiter)
  //  .onRequest(({ rateLimiter, ip, set, error }) => {
  //      if (rateLimiter.check(ip)) return error(420, 'Enhance your calm')
  //  })

  .onBeforeHandle(() => {
    console.log('1')
  })

  .use(cors({
    origin: 'localhost:4321',
    methods: ['GET'],
  }))

  .use(swagger({
    path: '/api/docs',
  }))

  .onRequest(({ request }) => {
    const { method, url } = request
    const path = new URL(url).pathname

    console.log(`Received: [${method}] ${path}`)
  })

  .get('/api/ping', () => 'pong')
  .get('/api/connected-authorities', () => 9999)

  .post('/auth', async ({ jwt, query, cookie: { auth }, body, redirect }) => {

    console.log('BODY', { pass: body.password });

    // Check if the user is already authenticated
    const value = await jwt.sign({ token: query.token as string })

    if (!body.password) {
      return error(401, 'Unauthorized')
    }

    auth?.set({
      value,
      // httpOnly: true,
      maxAge: 7 * 86400,
      path: '/',
    })

    return redirect('/', 303)
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

  .listen(3_000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;