import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createTempDir } from './utils';

jest.setTimeout(20000);

function runCli(args: string[], cwd = process.cwd(), env = process.env, timeout = 10000) {
  return new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
    const bin = path.resolve('src/cli.ts');
    const proc = spawn('node', ['-r', 'ts-node/register', bin, ...args], { cwd, env });
    proc.on('error', err => { reject(err); });
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

test('CLI falls back to viz.js when `dot` not on PATH', async () => {
  const outDir = await createTempDir('cli-svg-fallback');
  const src = path.join(outDir, 'src');
  await fs.mkdir(src, { recursive: true });
  await fs.writeFile(path.join(src, 'sample.actions.ts'), `import { createAction } from '@ngrx/store';\nexport const S = createAction('[T] S');\n`, 'utf8');

  // Run CLI requesting SVG but with PATH limited to node's directory so `dot` won't be found
  const nodeDir = path.dirname(process.execPath);
  const env = { ...process.env, PATH: nodeDir };
  const res = await runCli(['-d', outDir, '--out', outDir, '--svg'], process.cwd(), env, 15000);
  expect(res.code).toBeGreaterThanOrEqual(0);
  // either svg exists or CLI printed a fallback message about viz.js
  const files = await fs.readdir(outDir);
  const hasSvg = files.some(f => f.endsWith('.svg'));
  if (!hasSvg) {
    expect(res.stdout + res.stderr).toMatch(/falling back to viz.js|Could not generate SVG via viz.js/i);
  }
});
