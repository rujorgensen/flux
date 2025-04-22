// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import proxy from './proxy.conf.json' assert { type: 'json' };
import node from '@astrojs/node';
import { visualizer } from 'rollup-plugin-visualizer';
import tsconfigPaths from 'vite-tsconfig-paths'

// https://astro.build/config
export default defineConfig({
    output: 'server',
    outDir: '../../../dist/apps/frontend/portal',
    adapter: node({
        mode: 'standalone',
    }),
    site: 'https://example.com',
    integrations: [
        mdx(),
        sitemap(),
        svelte(),
    ],

    // Add Vite configuration with proxy settings
    vite: {
        plugins: [
            tsconfigPaths(),
            visualizer({
                emitFile: true,
                filename: 'stats.html',
            }),
        ],
        server: {
            proxy: {
                ...proxy,
                '/auth': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                    secure: false,
                },
                "/api": {
                    target: "http://localhost:3000",
                    changeOrigin: true,
                    secure: false
                }
            },
        }
    }
});