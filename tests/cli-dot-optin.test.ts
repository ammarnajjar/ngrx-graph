import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createTempDir } from './utils';

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

test('CLI writes JSON and only writes DOT when --dot passed', async () => {
  const outDir = await createTempDir('cli-optin');
  // create a minimal actions source
  const src = path.join(outDir, 'src');
  await fs.mkdir(src, { recursive: true });
  await fs.writeFile(path.join(src, 'sample.actions.ts'), `import { createAction } from '@ngrx/store';\nexport const S = createAction('[T] S');\n`, 'utf8');

  // run CLI without --dot
  let res = await runCli(['-d', outDir, '--out', outDir], process.cwd(), 15000);
  expect(res.code).toBeGreaterThanOrEqual(0);
  let files = await fs.readdir(outDir);
  expect(files).toContain('ngrx-graph.json');
  expect(files.some(f => f.endsWith('.dot'))).toBe(false);

  // now run CLI with --dot
  res = await runCli(['-d', outDir, '--out', outDir, '--dot'], process.cwd(), 15000);
  expect(res.code).toBeGreaterThanOrEqual(0);
  files = await fs.readdir(outDir);
  expect(files.some(f => f.endsWith('.dot'))).toBe(true);
});
