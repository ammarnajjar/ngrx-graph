import fs from 'fs/promises';
import path from 'path';
import { generateDotForAction } from '../../src/dot-generator';

test('focused generator emits payload arrowhead edges', async () => {
  const jsonPath = path.resolve('docs/examples/case2/out/ngrx-graph.json');
  const outDir = path.resolve('tmp/case2-dot-focused');
  await generateDotForAction(jsonPath, 'nestedAction1', outDir);
  const generated = await fs.readFile(path.join(outDir, 'nestedAction1.dot'), 'utf8');
  expect(generated).toContain('nestedAction1 -> action1 [arrowhead=dot]');
});
