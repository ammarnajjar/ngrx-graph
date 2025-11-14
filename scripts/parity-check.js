#!/usr/bin/env node
/* eslint-env node */
/* global console, process */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const log = console.log;
const error = console.error;
const exit = (code = 0) => globalThis.process.exit(code);
const repoRoot = path.resolve(__dirname, '..');
const examplesDir = path.join(repoRoot, 'docs', 'examples');

if (!fs.existsSync(examplesDir)) {
  error('No examples directory at', examplesDir);
  exit(1);
}

const entries = fs.readdirSync(examplesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => path.join(examplesDir, d.name));

let anyDiffs = false;
// If compiled CLI exists, move it aside so bin/run falls back to ts-node for parity
const compiledDist = path.join(repoRoot, 'dist');
let movedDist = false;
if (fs.existsSync(compiledDist)) {
  try {
    fs.renameSync(compiledDist, `${compiledDist}.bak`);
    movedDist = true;
  } catch (err) {
    error('Could not move dist folder aside:', err);
  }
}
for (const dir of entries) {
  const name = path.basename(dir);
  log('=== Checking', name, '===');
  const srcDir = path.join(dir, 'src');
  const outDir = path.join(dir, 'out');
  // ensure clean
  fs.rmSync(outDir, { recursive: true, force: true });

  // run dev
  const dev = spawnSync(path.join(repoRoot, 'bin', 'dev'), ['-d', srcDir, '--out', outDir, '--json', '--all', '--svg'], { cwd: repoRoot, stdio: 'inherit', env: process.env });
  if (dev.status !== 0) {
    error('dev failed for', name, 'exit', dev.status);
    exit(dev.status || 1);
  }
  const devOut = path.join(repoRoot, 'tmp', 'parity', 'dev', name);
  fs.rmSync(devOut, { recursive: true, force: true });
  fs.mkdirSync(devOut, { recursive: true });
  if (fs.existsSync(outDir)) copyDir(outDir, devOut);

  fs.rmSync(outDir, { recursive: true, force: true });

  // run run
  const run = spawnSync(path.join(repoRoot, 'bin', 'run'), ['-d', srcDir, '--out', outDir, '--json', '--all', '--svg'], { cwd: repoRoot, stdio: 'inherit', env: process.env });
  if (run.status !== 0) {
    error('run failed for', name, 'exit', run.status);
    exit(run.status || 1);
  }
  const runOut = path.join(repoRoot, 'tmp', 'parity', 'run', name);
  fs.rmSync(runOut, { recursive: true, force: true });
  fs.mkdirSync(runOut, { recursive: true });
  if (fs.existsSync(outDir)) copyDir(outDir, runOut);

  fs.rmSync(outDir, { recursive: true, force: true });

  // diff
  const diffs = diffDirs(devOut, runOut);
  if (diffs.length) {
    anyDiffs = true;
    console.log('Diffs for', name);
    log(diffs.join('\n'));
  } else {
    log('No diffs for', name);
  }
}

log('Parity check', anyDiffs ? 'found diffs' : 'ok');
// restore dist if we moved it
if (movedDist) {
  try { fs.renameSync(`${compiledDist}.bak`, compiledDist); } catch (err) { error('Could not restore dist folder:', err); }
}
exit(anyDiffs ? 2 : 0);

function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function diffDirs(a, b) {
  const diffs = [];
  const aSet = setFiles(a);
  const bSet = setFiles(b);
  for (const f of new Set([...aSet.keys(), ...bSet.keys()])) {
    const aPath = aSet.get(f);
    const bPath = bSet.get(f);
    if (!aPath) { diffs.push(`+ ${f}`); continue; }
    if (!bPath) { diffs.push(`- ${f}`); continue; }
    const aStat = fs.statSync(aPath);
    const bStat = fs.statSync(bPath);
    if (aStat.size !== bStat.size) { diffs.push(`S ${f}`); continue; }
    const aBuf = fs.readFileSync(aPath);
    const bBuf = fs.readFileSync(bPath);
    if (!aBuf.equals(bBuf)) diffs.push(`C ${f}`);
  }
  return diffs;
}

function setFiles(dir) {
  const m = new Map();
  if (!fs.existsSync(dir)) return m;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      const sub = setFiles(p);
      for (const [k, v] of sub) m.set(path.join(e.name, k), v);
    } else {
      m.set(e.name, p);
    }
  }
  return m;
}
