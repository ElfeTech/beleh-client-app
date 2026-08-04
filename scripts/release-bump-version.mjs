#!/usr/bin/env node
/**
 * Bumps the patch segment in package.json (0.1.0 → 0.1.1).
 * Used by prod release CI and optional local `npm run version:bump`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const match = /^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/.exec(pkg.version ?? '');
if (!match) {
  console.error(`Invalid semver in package.json: ${pkg.version}`);
  process.exit(1);
}

const major = Number(match[1]);
const minor = Number(match[2]);
const patch = Number(match[3]) + 1;
const nextVersion = `${major}.${minor}.${patch}`;

pkg.version = nextVersion;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(nextVersion);
