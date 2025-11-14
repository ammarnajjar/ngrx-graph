#!/usr/bin/env ts-node
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..');
const examplesDir = path.join(repoRoot, 'docs', 'examples');

// Ensure ts-node uses this repo's tsconfig when the script spawns children
if (!process.env.TS_NODE_PROJECT) {
  process.env.TS_NODE_PROJECT = path.join(repoRoot, 'tsconfig.json');
}

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
  // Step 1: force regeneration of the JSON payload only
  const forceArgs = ['-d', srcDir, '--out', outDir, '--force'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = {cwd: repoRoot, stdio: 'inherit', env: process.env} as any;
  const r1 = spawnSync(devBin, forceArgs, opts);
  if (r1.status !== 0) {
    console.error('JSON generation failed for', dir, 'exit code', r1.status);
    process.exit(r1.status ?? 1);
  }

  // Step 2: generate per-action DOT files and SVGs next to the JSON
  const genArgs = ['-d', srcDir, '--out', outDir, '--svg'];
  const r2 = spawnSync(devBin, genArgs, opts);
  if (r2.status !== 0) {
    console.error('DOT/SVG generation failed for', dir, 'exit code', r2.status);
    process.exit(r2.status ?? 1);
  }
}

console.log('All examples generated');
