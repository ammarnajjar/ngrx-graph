import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createTempDir } from './utils';

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

// create a larger fake project with many action files to exercise concurrency
async function scaffoldManyActions(root: string, count = 30) {
  const src = path.join(root, 'src');
  await fs.mkdir(src, { recursive: true });
  for (let i = 0; i < count; i++) {
    const fname = path.join(src, `a${i}.actions.ts`);
    await fs.writeFile(fname, `import { createAction } from '@ngrx/store';\nexport const A${i} = createAction('[T] A${i}');\n`, 'utf8');
  }
}

test('CLI handles --concurrency flag (smoke)', async () => {
  const out = await createTempDir('cli-concurrency');
  await scaffoldManyActions(out, 40);
  const res = await runCli(['-d', out, '--out', out, '--dot', '--concurrency', '2'], process.cwd(), 30000);
  expect(res.code).toBeGreaterThanOrEqual(0);
  const files = await fs.readdir(out);
  // expect JSON and some DOT files
  expect(files).toContain('ngrx-graph.json');
  expect(files.some(f => f.endsWith('.dot'))).toBe(true);
});
