#!/usr/bin/env bun

/**
 * Typechecks every library / publishable package in the workspace, bypassing nx for
 * speed. Runs `tsgo --noEmit` against each project's `tsconfig.lib.json`; cross-project
 * imports resolve via the `paths` in tsconfig.base.json, so no prior build is needed.
 *
 * This exists so type errors are caught locally (pre-push) instead of in CI, where they
 * only surface during a publishable package's declaration emit — the gap that let a
 * broken `jwt.sign(...)` signature reach CI.
 *
 * Scope — `tsconfig.lib.json` only. This mirrors what CI actually typechecks with tsc
 * (the libs + the mesh/agent/authority packages). Apps are intentionally excluded: the
 * backend portal builds via esbuild (`bun run build.js`, no tsc) and the frontend portal
 * typechecks through Angular's own compiler, so checking their `tsconfig.app.json` here
 * would (a) diverge from CI and (b) surface dependency-source errors under the portal
 * app's stricter `noUncheckedIndexedAccess` flag that a real .d.ts-consuming build never
 * sees. Add app support once those apps are clean under a direct tsc pass.
 *
 * Uses `tsgo` (`@typescript/native-preview`) for speed (~3x faster than tsc). On this
 * lib surface it agrees with the tsc that CI builds with; it's a preview compiler, so if
 * it ever diverges from CI, prefer matching CI — swap `TSGO` for the `tsc` binary.
 *
 * Usage: bun run scripts/typecheck.ts
 */

import { Glob } from 'bun';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const TSGO = resolve(ROOT, 'node_modules/.bin/tsgo');

// Bound concurrency so a large workspace doesn't spawn one tsgo per project at once.
const CONCURRENCY = 6;

// Projects with known pre-existing type errors, to be fixed and removed over time.
// - backend/features/network: branded-type mismatches in its *.spec.ts files (tests
//   pass raw strings where TNetworkId_S is expected). Test-only; CI never typechecks
//   specs and bun strips types at runtime, so these don't affect CI.
const EXCLUDE: string[] = [
    'libs/backend/features/network/',
];

async function findProjects(): Promise<string[]> {
    const projects: string[] = [];
    const glob = new Glob('**/tsconfig.lib.json');
    for await (const file of glob.scan({ cwd: ROOT, dot: false })) {
        if (file.includes('node_modules')) continue;
        if (EXCLUDE.some(excluded => file.includes(excluded))) continue;
        projects.push(file);
    }
    return projects.sort();
}

async function typecheck(project: string): Promise<{ project: string; ok: boolean; output: string; }> {
    const proc = Bun.spawn([TSGO, '--noEmit', '--pretty', '-p', project], {
        cwd: ROOT,
        stdout: 'pipe',
        stderr: 'pipe',
    });
    const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
    ]);
    return { project, ok: exitCode === 0, output: (stdout + stderr).trim() };
}

async function main(): Promise<void> {
    const projects = await findProjects();
    console.log(`Typechecking ${projects.length} projects with tsgo...\n`);

    const failures: { project: string; output: string; }[] = [];
    let index = 0;

    async function worker(): Promise<void> {
        while (index < projects.length) {
            const project = projects[index++];
            const { ok, output } = await typecheck(project);
            if (ok) {
                console.log(`  ✔ ${project}`);
            } else {
                console.log(`  ✘ ${project}`);
                failures.push({ project, output });
            }
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    if (failures.length > 0) {
        console.error(`\n${failures.length} project(s) failed typecheck:\n`);
        for (const { project, output } of failures) {
            console.error(`── ${project} ${'─'.repeat(Math.max(0, 60 - project.length))}`);
            console.error(output || '(no output)');
            console.error('');
        }
        process.exit(1);
    }

    console.log('\nAll projects typecheck clean.');
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
