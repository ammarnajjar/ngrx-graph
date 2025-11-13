import fs from 'fs/promises';
import path from 'path';
import { generateDotFilesFromJson } from '../src/dot-generator';

test('generate all.dot matches example for case2', async () => {
  const jsonPath = path.resolve('docs/examples/case2/out/ngrx-graph.json');
  const outDir = path.resolve('tmp/case2-dot');
  // ensure outDir is clean to avoid stale files from other tests
  await import('fs/promises').then(fs => fs.rm(outDir, { recursive: true, force: true }));
  await generateDotFilesFromJson(jsonPath, outDir);
  const generated = await fs.readFile(path.join(outDir, 'all.dot'), 'utf8');
  // assert important lines are present
  expect(generated).toContain('FirstComponent [shape="box"');
  expect(generated).toContain('nestedAction1 [color=black');
  expect(generated).toContain('action1 [fillcolor=linen');
  expect(generated).toContain('firstReducer [shape="hexagon"');
  expect(generated).toContain('FirstComponent -> nestedAction1');
  expect(generated).toContain('action1 -> nestedAction1');
  expect(generated).toContain('nestedAction1 -> nestedAction2');
  expect(generated).toContain('nestedAction1 -> action1 [arrowhead=dot]');
});
