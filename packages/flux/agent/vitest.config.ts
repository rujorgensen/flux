import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
    cacheDir: '../../../node_modules/.vite/packages/flux/agent',
    plugins: [nxViteTsPaths()],
    test: {
        watch: false,
        globals: true,
        environment: 'node',
        include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        reporters: ['default'],
        coverage: {
            reportsDirectory: '../../../coverage/packages/flux/agent',
            provider: 'v8',
        },
        passWithNoTests: true,
    },
});
