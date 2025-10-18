// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import proxy from './proxy.conf.json' with { type: 'json' };
import node from '@astrojs/node';
import { visualizer } from 'rollup-plugin-visualizer';
import tsconfigPaths from 'vite-tsconfig-paths'
import path from "node:path";
import tailwindcss from '@tailwindcss/vite';
import angular from '@analogjs/astro-angular';

// https://astro.build/config
export default defineConfig({
    output: 'server',
    outDir: '../../../dist/apps/frontend/portal',
    adapter: node({
        mode: 'standalone',
    }),
    site: 'https://example.com',
    integrations: [
        angular({

            vite: {
                //     inlineStylesExtension: 'scss|sass|less',
                transformFilter: (_code, id) => {
                    return id.includes('src/components/angular'); // <- only transform Angular TypeScript files
                },
            },
        }),
        mdx(),
        sitemap(),
        svelte(),
    ],

    // Add Vite configuration with proxy settings
    vite: {
        ssr: {
            // transform these packages during SSR. Globs supported
            noExternal: ['@rx-angular/**'],
        },

        plugins: [
            tsconfigPaths(),
            visualizer({
                emitFile: true,
                filename: 'stats.html',
            }),
            tailwindcss(),
        ],

        resolve: {
            alias: {
                $lib: path.resolve("./src"),
            },
        },
        server: {
            proxy: {
                ...proxy,
                '/auth': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                    secure: false,
                },
                '/api': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                    secure: false
                }
            },
        }
    }
});