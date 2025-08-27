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
});

// Copy package.json
const packageJSONFilePath = `/${values.projectRoot}/package.json`;
await Bun.write(`./dist${packageJSONFilePath}`, Bun.file(`.${packageJSONFilePath}`));

// Copy package.json
const readmeFile = `/${values.projectRoot}/README.md`;
await Bun.write(`./dist${readmeFile}`, Bun.file(`.${readmeFile}`));

