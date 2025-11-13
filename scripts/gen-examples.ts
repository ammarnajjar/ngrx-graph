#!/usr/bin/env ts-node
/* eslint-env node */
/* global process, console */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const repo = path.resolve(__dirname, '..');
const examplesDir = path.join(repo, 'docs', 'examples');

if (!fs.existsSync(examplesDir)) {
  console.error('No examples directory found at', examplesDir);
  process.exit(1);
}

const entries = fs.readdirSync(examplesDir, { withFileTypes: true });
for (const e of entries) {
  if (!e.isDirectory()) continue;
  const name = e.name;
  const src = path.join(examplesDir, name, 'src');
  const out = path.join(examplesDir, name, 'out');
  fs.mkdirSync(out, { recursive: true });

  console.log(`Generating DOTs for ${name}`);
  let res = spawnSync('npx', ['ts-node', 'src/cli.ts', '-a', '-d', src, '-o', out, '-f'], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`Failed to generate DOTs for ${name}`);
    process.exit(res.status || 1);
  }

  console.log(`Generating SVGs for ${name}`);
  res = spawnSync('npx', ['ts-node', 'src/cli.ts', '-a', '-d', src, '-o', out, '-f', '--svg'], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`Failed to generate SVGs for ${name}`);
    process.exit(res.status || 1);
  }
}

console.log('Examples regenerated successfully.');
