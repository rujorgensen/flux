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

// Clear the build folder
await Bun.$`rm -rf dist/${values.projectRoot}`;

// Build the project using Bun
await Bun.build({
    entrypoints: [`./${values.projectRoot}/src/main.ts`],
    outdir: `./dist/${values.projectRoot}`,
    naming: 'index.js',
    target: 'bun', // Use 'bun' as the target for Bun's native build
    minify: true,
    format: "esm"
});

// Copy package.json
const packageJSONFilePath = `/${values.projectRoot}/package.json`;
await Bun.write(`./dist${packageJSONFilePath}`, Bun.file(`.${packageJSONFilePath}`));

// Copy README.md
const readmeFile = `/${values.projectRoot}/README.md`;
await Bun.write(`./dist${readmeFile}`, Bun.file(`.${readmeFile}`));

