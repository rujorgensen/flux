/*
 * The publish setup for every npm package in packages/. Two faults this catches, both seen:
 * - a package that CI does not publish (flux-lite was not in publish.yml);
 * - a local publish script that cannot work (`nx-release-publish` calls `bun info` with a flag bun does not have).
 */
import { describe, expect, test } from 'bun:test';
import { Glob } from 'bun';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';

interface IPackage {
	project: string;
	dir: string; // packages/flux/lite
	name: string; // @persistica/flux-lite
	main: string;
}

const root: string = `${import.meta.dir}/..`;
const read = (path: string): string => readFileSync(`${root}/${path}`, 'utf8');

const packages: IPackage[] = Array.from(new Glob('packages/**/project.json').scanSync({ cwd: root }))
	.filter((path: string): boolean => !path.includes('node_modules'))
	.map((path: string): { path: string; project: { name: string; tags?: string[]; }; } => ({ path: path, project: JSON.parse(read(path)) }))
	.filter((p): boolean => (p.project.tags ?? []).includes('type:npm-package'))
	.map((p): IPackage => {
		const dir: string = dirname(p.path);
		const manifest: { name: string; main: string; } = JSON.parse(read(`${dir}/package.json`));

		return { project: p.project.name, dir: dir, name: manifest.name, main: manifest.main.replace(/^\.\//, '') };
	});

const matrix: { project_name: string; package_dir: string; }[] = Bun.YAML.parse(read('.github/workflows/publish.yml')).jobs.release.strategy.matrix.include;
const scripts: Record<string, string> = JSON.parse(read('package.json')).scripts;

describe('publish setup', () => {
	test('finds the npm packages', () => {
		expect(packages.map((p: IPackage): string => p.name)).toContain('@persistica/flux-lite');
	});

	describe.each(packages.map((p: IPackage): [string, IPackage] => [p.name, p]))('%s', (_name: string, p: IPackage) => {
		test('CI publishes it', () => {
			expect(matrix).toContainEqual(expect.objectContaining({ project_name: p.project, package_dir: p.dir }));
		});

		test('the local publish script builds it and publishes the build with npm, as CI does', () => {
			const script: string | undefined = scripts[`publish:${p.dir.split('/').pop()}`];
			expect(script).toContain(`nx run ${p.project}:build`);
			expect(script).toContain(`npm publish ./dist/${p.dir}`);
		});

		test('the build is a package npm can pack', () => {
			expect(Bun.spawnSync(['bunx', 'nx', 'run', `${p.project}:build`], { cwd: root }).exitCode).toBe(0);
			const pack = Bun.spawnSync(['npm', 'pack', '--dry-run', '--json', `./dist/${p.dir}`], { cwd: root });
			expect(pack.exitCode).toBe(0);
			const [packed] = JSON.parse(pack.stdout.toString()) as { name: string; files: { path: string; }[]; }[];
			expect(packed!.name).toBe(p.name);
			expect(packed!.files.map((f: { path: string; }): string => f.path)).toContain(p.main);
		}, 120_000);
	});
});
