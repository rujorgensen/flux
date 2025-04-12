import { watch } from 'node:fs';
import path from 'node:path';
import { $ } from 'bun';

const clearAndBuild = async (

) => {
    // Clear dist folder
    await $`rm -rf ./apps/flux/agent/src/demo/dist`;

    // Rebuild
    await build();
};

let server: any;

// Create a Set to store all connected WebSocket clients
const clients: Set<ReadableStreamDirectController> = new Set();

/**
 * Watch files for changes, and rebuild and reload server
 */
const watcher = watch(
    path.join(import.meta.dir, '..'),
    {
        recursive: true,
    },
    async (event, filename) => {
        console.log(`Detected ${event} in ${filename}`);

        if (!filename?.includes('dist')) {

        
            // 
            //    await $`persistica --configuration=./demo/schema/todo.persistica`;

            await clearAndBuild();

            console.log('Reloading server...');

            //             // Restart server
            server?.reload(serverConf);

            // Send reload signal to clients
            console.log(`Refreshing ${clients.size} clients...`);
            for await (const client of clients) {
                console.log('Emitting to client');
                await client.write('data:reload\n\n');
                await client.flush();
            }

            // console.log('Restarting main...');
            // try {
            //     $`bun run ./apps/flux/agent/src/demo/dist/server-a/main.js`.then().catch();
            // } catch {
            //     console.log('caught');
            // }

        }
    });


process.on('SIGINT', () => {
    // close watcher when Ctrl-C is pressed
    console.log('Closing watcher...');
    watcher.close();

    process.exit(0);
});

const build = async () => {
    console.log('🔨 Rebuilding...');

    await Bun.build({
        entrypoints: [
            './apps/flux/agent/src/demo/client-a/index.html',
        ],
        sourcemap: 'inline',
        outdir: './apps/flux/agent/src/demo/dist/client-a',
        minify: false,
    });

    await Bun.build({
        entrypoints: [
            './apps/flux/agent/src/demo/client-b/index.html',
        ],
        sourcemap: 'inline',
        outdir: './apps/flux/agent/src/demo/dist/client-b',
        minify: false,
    });

    await Bun.build({
        entrypoints: [
            './apps/flux/agent/src/demo/server-a/main.ts',
        ],
        sourcemap: 'inline',
        outdir: './apps/flux/agent/src/demo/dist/server-a',
        minify: false,
    });

    console.log('🔨 Done building...');
};

const serverConf = {
    port: 3000,
    idleTimeout: 0, // deactivate timeout
    hostname: '0.0.0.0',
    fetch: async (request: Request) => {
        const url = new URL(request.url);
        // Serve index.html for root
        const pathname = url.pathname === '/' ? '/index.html' : url.pathname;

        try {
            if (url.pathname === '/__bun_live_reload') {
                const signal = request.signal;

                return new Response(
                    new ReadableStream({
                        type: 'direct',
                        pull: async (
                            controller: ReadableStreamDirectController,
                        ) => {
                            clients.add(controller);

                            while (!signal.aborted) {
                                //   await controller.write(`data:reload\n\n`);
                                //    await controller.flush();
                                await Bun.sleep(500);
                            }

                            clients.delete(controller);
                            controller.close();
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
                );
            }

            const file = Bun.file(`./apps/flux/agent/src/demo/dist/client-a${pathname}`);

            if (pathname === '/index.html') {
                const text = await file.text();

                const injectedHtml = text.replace('</head>', `<script>
                   new EventSource('/__bun_live_reload').onmessage = (e) => {
                       if (e.data === 'reload') {
                           location.reload();
                       }
                   };
                   </script></head>`);
                // Inject the script tag
                return new Response(injectedHtml, { status: 200, headers: { 'Content-Type': 'text/html' } });
            }

            return new Response(file);
        } catch {
            return new Response('404 Not Found', { status: 404 });
        }
    },
};

await clearAndBuild();

console.log('Restarting main...');
try {
    $`bun --watch ./apps/flux/agent/src/demo/server-a/main.ts`.then();
} catch { }

server = Bun.serve(serverConf);
// $`bun --hot run ./apps/flux/agent/src/demo/dist/server-a/main.js`.then();
console.log(`🚀 Demo server running on http://${server.hostname}:${serverConf.port}`);
