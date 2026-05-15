import { parseArgs } from 'bun:util';

// Pass the project root as an argument to the build script
const { values } = parseArgs({
    args: Bun.argv,
    options: {
        projectRoot: {
            type: 'string',
        }
    },
    strict: true,
    allowPositionals: true,
});

// Build the project using Bun
await Bun.build({
    entrypoints: [`./${values.projectRoot}/src/main.ts`],
    outdir: `./dist/${values.projectRoot}`,
    target: 'bun', // Use 'bun' as the target for Bun's native build
    minify: true,
    // sourcemap: 'linked', // default 'none'
});
