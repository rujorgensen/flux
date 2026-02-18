/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => ({
    root: __dirname,
    cacheDir:
        '../../../../../node_modules/.vite/libs/flux/mesh/core/redis/conection',
    plugins: [
        nxViteTsPaths(),
        nxCopyAssetsPlugin(['*.md']),
    ],
    test: {
        watch: false,
        globals: true,
        environment: 'node',
        include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        reporters: ['default'],
        coverage: {
            reportsDirectory:
                '../../../../../coverage/libs/flux/mesh/core/redis/conection',
            provider: 'v8' as const,
        },
        passWithNoTests: true,
    },
}));
