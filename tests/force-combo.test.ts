import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

jest.setTimeout(30000);

function runCli(args: string[], cwd = process.cwd(), timeout = 15000) {
  return new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
    const bin = path.resolve('src/cli.ts');
    const proc = spawn('node', ['-r', 'ts-node/register', bin, ...args], { cwd });
    let out = '';
    let err = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.stderr.on('data', d => err += d.toString());
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('timeout'));
    }, timeout);
    proc.on('exit', code => {
      clearTimeout(timer);
      resolve({ stdout: out, stderr: err, code });
    });
  });
}

test('--force alone writes JSON and stops', async () => {
  const outDir = path.resolve('tmp/force-case1');
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });
  const args = ['-d', outDir, '--out', outDir, '--force'];
  const res = await runCli(args);
  expect(res.code).toBeGreaterThanOrEqual(0);
  // JSON must exist; there should be no .dot files
  const files = await fs.readdir(outDir);
  expect(files).toContain('ngrx-graph.json');
  const hasDot = files.some(f => f.endsWith('.dot'));
  expect(hasDot).toBe(false);
});

test('--force combined with --all regenerates JSON and writes all.dot', async () => {
  const outDir = path.resolve('tmp/force-case2');
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const args = ['-d', outDir, '--out', outDir, '--force', '--all'];
  const res = await runCli(args, process.cwd(), 20000);
  expect(res.code).toBeGreaterThanOrEqual(0);
  const files = await fs.readdir(outDir);
  expect(files).toContain('ngrx-graph.json');
  // aggregated DOT should exist
  const hasAllDot = files.some(f => f === 'all.dot');
  expect(hasAllDot).toBe(true);
});

test('--force combined with positional action regenerates JSON and writes focused dot', async () => {
  const outDir = path.resolve('tmp/force-case3');
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  // use an action name known to exist in examples
  const actionName = 'Action1';
  const args = ['-d', outDir, '--out', outDir, '--force', actionName];
  const res = await runCli(args, process.cwd(), 20000);
  expect(res.code).toBeGreaterThanOrEqual(0);
  const files = await fs.readdir(outDir);
  expect(files).toContain('ngrx-graph.json');
  const focusedDot = `${actionName}.dot`;
  const hasFocused = files.some(f => f === focusedDot);
  expect(hasFocused).toBe(true);
});

test('--force combined with --svg regenerates JSON and attempts SVG generation', async () => {
  const outDir = path.resolve('tmp/force-case4');
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const args = ['-d', outDir, '--out', outDir, '--force', '--all', '--svg'];
  const res = await runCli(args, process.cwd(), 20000);
  expect(res.code).toBeGreaterThanOrEqual(0);
  const files = await fs.readdir(outDir);
  expect(files).toContain('ngrx-graph.json');
  // all.dot should exist
  expect(files.some(f => f === 'all.dot')).toBe(true);
  // either svg exists or CLI printed a warning about SVG generation
  const hasSvg = files.some(f => f.endsWith('.svg'));
  if (!hasSvg) {
    expect(res.stdout + res.stderr).toMatch(/Could not generate SVGs|Could not generate SVG/);
  }
});
