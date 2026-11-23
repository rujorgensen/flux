/*
 * CI publishes every npm package in packages/. flux-lite was not in publish.yml, so its first release needed a
 * manual publish.
 */
import { expect, test } from 'bun:test';
import { Glob } from 'bun';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';

const root: string = `${import.meta.dir}/..`;
const read = (path: string): string => readFileSync(`${root}/${path}`, 'utf8');

const packages: { project_name: string; package_dir: string; }[] = Array.from(new Glob('packages/**/project.json').scanSync({ cwd: root }))
	.filter((path: string): boolean => !path.includes('node_modules'))
	.map((path: string): { path: string; project: { name: string; tags?: string[]; }; } => ({ path: path, project: JSON.parse(read(path)) }))
	.filter((p): boolean => (p.project.tags ?? []).includes('type:npm-package'))
	.map((p): { project_name: string; package_dir: string; } => ({ project_name: p.project.name, package_dir: dirname(p.path) }));

test('the publish workflow has an entry for every npm package', () => {
	const matrix: { project_name: string; package_dir: string; }[] = Bun.YAML.parse(read('.github/workflows/publish.yml')).jobs.release.strategy.matrix.include;

	expect(packages.map((p): string => p.project_name)).toContain('persistica-flux-lite');
	packages.forEach((p): void => expect(matrix).toContainEqual(expect.objectContaining(p)));
});
