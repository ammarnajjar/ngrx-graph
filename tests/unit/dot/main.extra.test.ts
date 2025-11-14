import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { generateAllFromPayload } from '../../../src/dot/main';
import type { GraphPayload } from '../../../src/dot/types';

test('generateAllFromPayload writes all.dot with expected nodes and edges', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ngrx-graph-test-'));
  const payload = {
    allActions: [{ name: 'a1' }, { name: 'a2' }],
    fromComponents: { C1: ['a1'] },
    fromEffects: {},
    fromReducers: {},
    loadedActions: [],
  } as GraphPayload;

  const p = await generateAllFromPayload(payload, tmp);
  const txt = await fs.readFile(p, 'utf8');
  expect(txt).toMatch(/digraph/);
  expect(txt).toMatch(/a1/);
  expect(txt).toMatch(/a2/);
});
