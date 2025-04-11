import { Elysia, error, t } from "elysia";
// import { $ } from "bun";
import jwt from "@elysiajs/jwt";


// make TypeScript happy
// ½declare global {
// ½  var count: number;
// ½}

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
import { swagger } from '@elysiajs/swagger';


// * Host the frontend and static resources 
// try {
//   $`HOST=0.0.0.0 PORT=3001 bunx run ../../../dist/apps/frontend/portal/server/entry.mjs`
//     .then(() => {
//       console.log("Frontend server started on port 3001");
//     })
//     ;
// } catch {
//   // console.error("Server might be runnning");
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


  .use(swagger({
    path: '/api/docs',
  }))

  .onRequest(({ request }) => {
    const { method, url } = request
    const path = new URL(url).pathname

    console.log(`Received: [${method}] ${path}`)
  })

  .get('/api/ping', () => 'pong')

  .post('/auth', async ({ jwt, query, cookie: { auth }, body, redirect }) => {

    console.log("BODY", { pass: body.password });

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
      console.log("validate");
      // if (!validateSession(session.value)) return error(401)
    }
  })

  .listen(3_000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

