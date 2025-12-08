import type {
    SpawnOptions
} from 'bun';

const spawnOptions: SpawnOptions.OptionsObject = {
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
};

const run = async () => {
    Bun.spawn(
        [
            'nx',
            'serve',
            '@flux/portal-ui',
        ],
        spawnOptions,
    );
    Bun.spawn(
        [
            'nx',
            'serve',
            'backend-portal',
        ],
        spawnOptions,
    );
    // Bun.spawn(["nx", "serve-static", "backend-portal"], spawnOptions)

    process.on('SIGINT', async () => {
        console.log('Cleaning up...');
    });
};

run();