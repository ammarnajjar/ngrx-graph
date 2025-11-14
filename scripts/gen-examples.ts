#!/usr/bin/env ts-node
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..');
const examplesDir = path.join(repoRoot, 'docs', 'examples');

if (!fs.existsSync(examplesDir)) {
  console.error('No examples directory at', examplesDir);
  process.exit(1);
}

const entries = fs.readdirSync(examplesDir, {withFileTypes: true})
  .filter(d => d.isDirectory())
  .map(d => path.join(examplesDir, d.name));

for (const dir of entries) {
  const srcDir = path.join(dir, 'src');
  const outDir = path.join(dir, 'out');
  if (!fs.existsSync(srcDir)) {
    console.warn('Skipping', dir, '- no src directory');
    continue;
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive: true});

  console.log('Generating for', dir);
  // Use the dev binary which now accepts flags directly. Resolve absolute
  // paths to avoid nested-path issues and run from repo root.
  const devBin = path.join(repoRoot, 'bin', 'dev');
  // Use --force + --svg (no --all) to generate per-action DOT and SVG files
  const args = ['-d', srcDir, '--out', outDir, '--force', '--svg'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = {cwd: repoRoot, stdio: 'inherit'} as any;
  const res = spawnSync(devBin, args, opts);
  if (res.status !== 0) {
    console.error('Command failed for', dir, 'exit code', res.status);
    process.exit(res.status ?? 1);
  }
}

console.log('All examples generated');
