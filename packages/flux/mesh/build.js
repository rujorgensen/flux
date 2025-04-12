await Bun.build({
    entrypoints: ['./posium/apps/flux/backend-data-lake/src/main.ts'],
    // sourcemap: 'inline',
    outdir: '../../../../dist/posium/apps/flux/backend-data-lake/src/main.ts',
    minify: false,
});
