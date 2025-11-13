import fs from 'fs/promises';
import path from 'path';
import { makeEdges } from '../src/dot/edges';
import { generateDotFilesFromPayload } from '../src/dot/main';
import { makeNodes } from '../src/dot/nodes';
import { GraphPayload } from '../src/dot/types';

test('cycle in effects does not infinite loop in focused generator', async () => {
  const payload: GraphPayload = {
    allActions: [{ name: 'a' }, { name: 'b' }],
    fromComponents: {},
    fromEffects: { e1: { input: ['a'], output: ['b'] }, e2: { input: ['b'], output: ['a'] } },
    fromReducers: {},
    loadedActions: [],
  };
  const out = path.resolve('tmp/dot-edgecase-cycle');
  await generateDotFilesFromPayload(payload, out);
  const focused = await fs.readFile(path.join(out, 'a.dot'), 'utf8');
  expect(focused).toContain('a -> b');
  expect(focused).toContain('b -> a');
});

test('reducers are shown as hexagon and not traversed as actions', () => {
  const payload: GraphPayload = {
    allActions: [{ name: 'a' }],
    fromComponents: {},
    fromEffects: {},
    fromReducers: { red: ['a'] },
  };
  const nodes = makeNodes(payload);
  expect(nodes).toContain('red [shape="hexagon", color=purple, fillcolor=purple, fontcolor=white, style=filled]');
  const edges = makeEdges(payload);
  expect(edges).toContain('a -> red');
});

test('empty payloads produce only digraph wrapper', async () => {
  const payload: GraphPayload = {
    allActions: [],
    fromComponents: {},
    fromEffects: {},
    fromReducers: {},
    loadedActions: [],
  };
  const out = path.resolve('tmp/dot-edgecase-empty');
  await generateDotFilesFromPayload(payload, out);
  const all = await fs.readFile(path.join(out, 'all.dot'), 'utf8');
  expect(all.trim()).toMatch(/^digraph \{[\s\S]*\}$/);
});
