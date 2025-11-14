import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

jest.setTimeout(20000);

function runCli(args: string[], cwd = process.cwd(), timeout = 10000) {
  return new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
    const bin = path.resolve('src/cli.ts');
    const proc = spawn('node', ['-r', 'ts-node/register', bin, ...args], { cwd });
    let out = '';
    let err = '';
    proc.stdout.on('data', d => (out += d.toString()));
    proc.stderr.on('data', d => (err += d.toString()));
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

test('cli top-level run writes JSON when --json passed', async () => {
  const tmp = await fs.mkdtemp(path.join('/tmp', 'ngrx-cli-'));
  const outDir = path.join(tmp, 'out');
  await fs.mkdir(outDir, { recursive: true });
  const args = ['--dir', tmp, '--out', outDir, '--json'];
  const res = await runCli(args, process.cwd(), 10000);
  expect(res.code).toBeGreaterThanOrEqual(0);
  const outFile = path.join(outDir, 'ngrx-graph.json');
  const stat = await fs.stat(outFile);
  expect(stat.isFile()).toBeTruthy();
  const txt = await fs.readFile(outFile, 'utf8');
  const payload = JSON.parse(txt);
  expect(payload).toHaveProperty('allActions');
  expect(Array.isArray(payload.allActions)).toBeTruthy();
});
