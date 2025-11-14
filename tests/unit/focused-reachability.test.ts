import fs from 'fs/promises';
import path from 'path';
import { generateDotForActionPayload } from '../../src/dot/generator';
import { GraphPayload } from '../../src/dot/types';

test('focused reachability sample', async () => {
  const payload: GraphPayload = JSON.parse(
    await fs.readFile(path.resolve('docs/examples/case3/out/ngrx-graph.json'), 'utf8'),
  );
  const out = path.resolve('tmp/test-focused');
  await fs.mkdir(out, { recursive: true });
  await generateDotForActionPayload(payload, 'action1', out);
  const dot = await fs.readFile(path.join(out, 'action1.dot'), 'utf8');
  expect(dot).toContain('action1');
});
