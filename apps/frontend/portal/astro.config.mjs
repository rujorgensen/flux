// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import proxy from './proxy.conf.json' assert { type: 'json' };
import node from '@astrojs/node';

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
        server: {
            proxy,
        }
    }
});