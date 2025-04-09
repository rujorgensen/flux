// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import proxy from './proxy.conf.json' assert { type: 'json' };

// https://astro.build/config
export default defineConfig({
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