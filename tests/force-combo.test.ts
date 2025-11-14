import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createTempDir } from './helpers/utils';

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

test('--json alone writes JSON and stops', async () => {
  const outDir = await createTempDir('force-case1');
  const args = ['-d', outDir, '--out', outDir, '--json'];
  const res = await runCli(args);
  expect(res.code).toBeGreaterThanOrEqual(0);
  // JSON must exist; there should be no .dot files
  const files = await fs.readdir(outDir);
  expect(files).toContain('ngrx-graph.json');
  const hasDot = files.some(f => f.endsWith('.dot'));
  expect(hasDot).toBe(false);
});

test('reuses existing JSON when --cache provided', async () => {
  const outDir = await createTempDir('cache-case1');
  const outFile = path.join(outDir, 'ngrx-graph.json');
  // create a simple actions source so scanning will find a predictable action
  const srcDir = path.join(outDir, 'src');
  await fs.mkdir(srcDir, { recursive: true });
  const actionFile = path.join(srcDir, 'sample.actions.ts');
  await fs.writeFile(actionFile, `import { createAction } from '@ngrx/store';\nexport const ActionScanned = createAction('[Test] Scanned');\n`, 'utf8');

  const payload = { allActions: [{ name: 'preexisting', nested: false }] };
  await fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8');
  const before = await fs.readFile(outFile, 'utf8');

  const args = ['-d', outDir, '--out', outDir, '--cache'];
  const res = await runCli(args);
  expect(res.code).toBeGreaterThanOrEqual(0);

  const after = await fs.readFile(outFile, 'utf8');
  // with --cache we should reuse the preexisting JSON (content unchanged)
  expect(after).toBe(before);
});

test('rewrites JSON when --cache not provided (default)', async () => {
  const outDir = await createTempDir('cache-case2');
  const outFile = path.join(outDir, 'ngrx-graph.json');
  // create a simple actions source so scanning will find a predictable action
  const srcDir = path.join(outDir, 'src');
  await fs.mkdir(srcDir, { recursive: true });
  const actionFile = path.join(srcDir, 'sample.actions.ts');
  await fs.writeFile(actionFile, `import { createAction } from '@ngrx/store';\nexport const ActionScanned = createAction('[Test] Scanned');\n`, 'utf8');

  const payload = { allActions: [{ name: 'preexisting', nested: false }] };
  await fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8');

  const args = ['-d', outDir, '--out', outDir];
  const res = await runCli(args, process.cwd(), 20000);
  expect(res.code).toBeGreaterThanOrEqual(0);

  const after = await fs.readFile(outFile, 'utf8');
  // the rewritten payload should contain the scanned action name
  expect(after).toMatch(/Scanned/);
});

test('--json combined with --all regenerates JSON and writes all.dot', async () => {
  const outDir = await createTempDir('force-case2');

  const args = ['-d', outDir, '--out', outDir, '--json', '--all', '--dot'];
  const res = await runCli(args, process.cwd(), 20000);
  expect(res.code).toBeGreaterThanOrEqual(0);
  const files = await fs.readdir(outDir);
  expect(files).toContain('ngrx-graph.json');
  // aggregated DOT should exist
  const hasAllDot = files.some(f => f === 'all.dot');
  expect(hasAllDot).toBe(true);
});

test('--json combined with positional action regenerates JSON and writes focused dot', async () => {
  const outDir = await createTempDir('force-case3');

  // use an action name known to exist in examples
  const actionName = 'Action1';
  const args = ['-d', outDir, '--out', outDir, '--json', '--dot', actionName];
  const res = await runCli(args, process.cwd(), 20000);
  expect(res.code).toBeGreaterThanOrEqual(0);
  const files = await fs.readdir(outDir);
  expect(files).toContain('ngrx-graph.json');
  const focusedDot = `${actionName}.dot`;
  const hasFocused = files.some(f => f === focusedDot);
  expect(hasFocused).toBe(true);
});

test('--json combined with --svg regenerates JSON and attempts SVG generation', async () => {
  const outDir = await createTempDir('force-case4');

  const args = ['-d', outDir, '--out', outDir, '--json', '--all', '--svg'];
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
