import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { generateDotForAction } from '../src/dot-generator';
import { registerTempRoot } from './_temp-helper';

test('focused generator emits payload arrowhead edges', async () => {
  const jsonPath = path.resolve('docs/examples/case2/out/ngrx-graph.json');
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'ngrx-graph-'));
  registerTempRoot(base);
  const outDir = path.join(base, 'case2-dot-focused');
  await generateDotForAction(jsonPath, 'nestedAction1', outDir);
  const generated = await fs.readFile(path.join(outDir, 'nestedAction1.dot'), 'utf8');
  expect(generated).toContain('nestedAction1 -> action1 [arrowhead=dot]');
  expect(generated).toContain('nestedAction1 -> action2 [arrowhead=dot]');
});
