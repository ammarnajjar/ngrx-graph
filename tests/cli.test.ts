import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createTempDir } from './utils';
// allow longer timeout for CLI integration test
jest.setTimeout(20000);

function runCli(args: string[], cwd = process.cwd(), timeout = 10000) {
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

test('CLI generates DOT and attempts SVG (graceful if dot missing)', async () => {
  const outDir = await createTempDir('cli-case2');
  // CLI now takes --out as an output directory; JSON will be written to --out/ngrx-graph.json
  const args = ['-d', outDir, '--out', outDir, '--svg'];
  // ensure outDir exists
  await fs.mkdir(outDir, { recursive: true });
  const res = await runCli(args);
  expect(res.code).toBeGreaterThanOrEqual(0);
  // either svg files exist or the CLI warned about absence of dot
  const files = await fs.readdir(outDir);
  const hasDot = files.some(f => f.endsWith('.dot'));
  const hasSvg = files.some(f => f.endsWith('.svg'));
  expect(hasDot).toBe(true);
  // SVG may or may not exist depending on environment
  if (!hasSvg) {
    expect(res.stdout + res.stderr).toMatch(/Could not generate SVGs|Could not generate SVG/);
  }
});
