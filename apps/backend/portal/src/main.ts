import { Elysia } from "elysia";
import { $ } from "bun";

// * Host the frontend and static resources 
try {
  await $`HOST=0.0.0.0 PORT=3001 bunx run ../../../dist/apps/frontend/portal/server/entry.mjs`;
} catch {
  console.error("Server might be runnning");
}

// * Host the api
const app = new Elysia()
  .get("/api/", () => "Hello Elysia")
  .get('/api/ping', () => 'pong')

  // * Proxy all other requests to the frontend server
  .get('/*', async ({ request }) => {
    const original = new URL(request.url);
    const proxyUrl = `http://localhost:3001${original.pathname}`;

    return await fetch(proxyUrl, {
      headers: {
        ...request.headers,
      },
    });
  })

  .listen(3_000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

