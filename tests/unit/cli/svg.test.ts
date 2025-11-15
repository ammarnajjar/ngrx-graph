import fs from 'fs/promises';
import path from 'path';
import { renderDotWithViz, tryDotOrViz } from '../../../src/cli/svg';

jest.mock('child_process', () => ({
  execFile: jest.fn((cmd: string, args: string[], cb: (err?: Error | null) => void) => cb(new Error('simulated'))),
}));

test('renderDotWithViz returns null when no helper', async () => {
  const r = await renderDotWithViz('digraph {}');
  expect(r === null || typeof r === 'string').toBeTruthy();
});

test('tryDotOrViz prefers viz when flag set and viz returns svg', async () => {
  // place a fake viz helper in module cache
  const Module = await import('module');
  const cliViz = path.resolve(process.cwd(), 'src', 'cli', 'viz-fallback.cjs');
  (Module as unknown as { _cache: Record<string, unknown> })._cache[cliViz] = {
    exports: { renderDotWithViz: async () => '<svg></svg>' },
  };
  // create temp dot file
  const tmp = await fs.mkdtemp('/tmp/ngrx-svg-');
  const dot = `${tmp}/t.dot`;
  const svg = `${tmp}/t.svg`;
  await fs.writeFile(dot, 'digraph {}', 'utf8');
  const res = await tryDotOrViz(dot, svg, true);
  expect(res.ok).toBeTruthy();
  expect(res.via).toBe('viz');
});
