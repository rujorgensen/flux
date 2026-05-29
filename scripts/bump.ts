#!/usr/bin/env bun

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { argv } from 'node:process'

const PACKAGES = [
  'packages/flux/agent',
  'packages/flux/authority',
  'packages/flux/mesh',
  'apps/frontend/portal',
  'apps/backend/portal',
]

function incrementVersion(version: string, type: 'major' | 'minor' | 'patch' = 'patch'): string {
  const [major, minor, patch] = version.split('.').map(Number)
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`
  }
}

function replaceVersion(content: string, oldVersion: string, newVersion: string): string {
  const versionPattern = /("version":\s*)("[^"]+")/g
  let replaced = false
  return content.replace(versionPattern, (match, prefix, quotedVersion) => {
    const version = quotedVersion.slice(1, -1)
    if (version === oldVersion && !replaced) {
      replaced = true
      return `${prefix}"${newVersion}"`
    }
    return match
  })
}

async function bumpPackage(pkgPath: string, type: 'major' | 'minor' | 'patch'): Promise<void> {
  const fullPath = resolve(pkgPath, 'package.json')
  const content = await readFile(fullPath, 'utf-8')
  const pkg = JSON.parse(content)
  const oldVersion = pkg.version
  const newVersion = incrementVersion(oldVersion, type)
  
  const newContent = replaceVersion(content, oldVersion, newVersion)
  
  await writeFile(fullPath, newContent)
  
  console.log(`  ${pkg.name || pkgPath}: ${oldVersion} -> ${newVersion}`)
}

async function main() {
  const type = (argv[2] ?? 'patch') as 'major' | 'minor' | 'patch'
  
  if (!['major', 'minor', 'patch'].includes(type)) {
    console.error('Usage: bun run bump [major|minor|patch]')
    console.error('Default: patch')
    process.exit(1)
  }
  
  console.log(`Bumping versions (${type})...\n`)
  
  for (const pkgPath of PACKAGES) {
    try {
      await bumpPackage(pkgPath, type)
    } catch (err: unknown) {
      console.error(`Error bumping ${pkgPath}: ${String(err)}`)
      process.exit(1)
    }
  }
  
  console.log('\nDone!')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
