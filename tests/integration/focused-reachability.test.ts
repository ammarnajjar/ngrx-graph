import fs from 'fs/promises';
import path from 'path';
import { generateDotForActionPayload } from '../../src/dot/generator';
import { GraphPayload } from '../../src/dot/types';
import { createTempDir } from '../helpers/utils';

describe('focused DOT reachability', () => {
  test('case3 action1.dot does not include unreachable action3', async () => {
    const payload: GraphPayload = JSON.parse(
      await fs.readFile(path.resolve('docs/examples/case3/out/ngrx-graph.json'), 'utf8'),
    );
    const out = await createTempDir('test-focused');
    await generateDotForActionPayload(payload, 'action1', out);
    const dot = await fs.readFile(path.join(out, 'action1.dot'), 'utf8');
    expect(dot).toContain('action1');
    expect(dot).toContain('action2');
    expect(dot).not.toContain('action3');
  });
});
