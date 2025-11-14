import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createTempDir } from '../helpers/utils';

jest.setTimeout(20000);

function runCliWithPreload(args: string[], preload: string, cwd = process.cwd(), env = process.env, timeout = 10000) {
  return new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
      const bin = path.resolve('src/cli.ts');
      const proc = spawn(process.execPath, ['-r', preload, '-r', 'ts-node/register', bin, ...args], { cwd, env });
    proc.on('error', err => reject(err));
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

// Preload file that patches child_process.execFile to always error
const preloadContent = `
const child = require('child_process');
const orig = child.execFile;
child.execFile = function() {
  const cb = arguments[arguments.length - 1];
  if (typeof cb === 'function') cb(new Error('simulated dot failure'));
  return { killed: false };
};
// Provide a fake viz helper module at runtime by adding to require cache
const Module = require('module');
const path = require('path');
const vizPath = path.resolve(process.cwd(), 'node_modules', 'viz-fake', 'index.js');
Module._cache = Module._cache || {};
Module._cache[vizPath] = {exports: {default: {renderString: async (txt) => '<svg>'+txt+'</svg>'}}};
// Also mock the cli viz-fallback to point to our fake implementation when required dynamically
const cliVizPath = path.resolve(process.cwd(), 'src', 'cli', 'viz-fallback.cjs');
Module._cache[cliVizPath] = {exports: {renderDotWithViz: async (txt) => '<svg>'+txt+'</svg>'}};
`;

test('when dot fails, CLI uses viz.js fallback (mocked)', async () => {
  const outDir = await createTempDir('cli-viz-mock');
  const src = path.join(outDir, 'src');
  await fs.mkdir(src, { recursive: true });
  await fs.writeFile(
    path.join(src, 'sample.actions.ts'),
    `import { createAction } from '@ngrx/store';\nexport const S = createAction('[T] S');\n`,
    'utf8',
  );

  const preloadPath = path.join(outDir, 'preload.js');
  await fs.writeFile(preloadPath, preloadContent, 'utf8');

  // ensure PATH doesn't include a real dot to avoid race with system dot
  const env = { ...process.env, PATH: '' };
  const res = await runCliWithPreload(['-d', outDir, '--out', outDir, '--svg', '--viz'], preloadPath, process.cwd(), env, 15000);
  expect(res.code).toBeGreaterThanOrEqual(0);
  const files = await fs.readdir(outDir);
  const hasSvg = files.some(f => f.endsWith('.svg'));
  expect(hasSvg).toBe(true);
});
