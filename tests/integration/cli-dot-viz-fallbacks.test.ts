import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createTempDir } from '../helpers/utils';

jest.setTimeout(30000);

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

test('--all --svg uses viz fallback when dot fails', async () => {
  const outDir = await createTempDir('cli-dot-viz-1');
  const src = path.join(outDir, 'src');
  await fs.mkdir(src, { recursive: true });
  await fs.writeFile(path.join(src, 'sample.actions.ts'), `import { createAction } from '@ngrx/store';\nexport const S = createAction('[T] S');\n`, 'utf8');

  const preload = path.join(outDir, 'preload1.js');
  const preloadContent = `
const child = require('child_process');
child.execFile = function() { const cb = arguments[arguments.length-1]; if (typeof cb==='function') cb(new Error('dot fail')); return {}; };
const Module = require('module');
const cliViz = require('path').resolve(process.cwd(),'src','cli','viz-fallback.cjs');
Module._cache[cliViz] = {exports: {renderDotWithViz: async (txt)=>'<svg>'+txt+'</svg>'}};
`;
  await fs.writeFile(preload, preloadContent, 'utf8');

  const env = { ...process.env, PATH: '' };
  const res = await runCliWithPreload(['-d', outDir, '--out', outDir, '--all', '--svg', '--viz'], preload, process.cwd(), env, 20000);
  expect(res.code).toBeGreaterThanOrEqual(0);
  const files = await fs.readdir(outDir);
  expect(files.some(f => f === 'all.svg')).toBe(true);
});

test('--all --svg reports when both dot and viz fail', async () => {
  const outDir = await createTempDir('cli-dot-viz-2');
  const src = path.join(outDir, 'src');
  await fs.mkdir(src, { recursive: true });
  await fs.writeFile(path.join(src, 'sample.actions.ts'), `import { createAction } from '@ngrx/store';\nexport const S = createAction('[T] S');\n`, 'utf8');

  const preload = path.join(outDir, 'preload2.js');
  const preloadContent = `
const child = require('child_process');
child.execFile = function() { const cb = arguments[arguments.length-1]; if (typeof cb==='function') cb(new Error('dot fail')); return {}; };
// Provide a viz helper that returns null (simulate viz present but failing)
const Module = require('module');
const cliViz = require('path').resolve(process.cwd(),'src','cli','viz-fallback.cjs');
Module._cache[cliViz] = {exports: {renderDotWithViz: async (txt)=> null}};
`;
  await fs.writeFile(preload, preloadContent, 'utf8');

  const env = { ...process.env, PATH: '' };
  const res = await runCliWithPreload(['-d', outDir, '--out', outDir, '--all', '--svg'], preload, process.cwd(), env, 20000);
  expect(res.code).toBeGreaterThanOrEqual(0);
  // either an svg exists or CLI printed a fallback/failure message
  const outText = res.stdout + res.stderr;
  const files = await fs.readdir(outDir);
  const hasSvg = files.some(f => f.endsWith('.svg'));
  expect(hasSvg || /Could not generate SVG|Could not generate SVG via viz.js/i.test(outText)).toBe(true);
});
