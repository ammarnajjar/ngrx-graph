import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { generateDotForActionPayload } from '../src/dot/generator';
import { generateDotFilesFromPayload } from '../src/dot/main';
import { makeNodes } from '../src/dot/nodes';
import { GraphPayload } from '../src/dot/types';
import { registerTempRoot } from './_temp-helper';

test('makeNodes emits component and action node strings', () => {
  const payload: GraphPayload = {
    allActions: [{ name: 'a', nested: false }, { name: 'b', nested: true }],
    fromComponents: { Comp: ['a'] },
    fromReducers: { red: ['a'] },
    fromEffects: {},
  };
  const nodes = makeNodes(payload);
  expect(nodes).toEqual(expect.arrayContaining([
    'Comp [shape="box", color=blue, fillcolor=blue, fontcolor=white, style=filled]',
    'a [fillcolor=linen, style=filled]',
    'b [color=black, fillcolor=lightcyan, fontcolor=black, style=filled]',
    'red [shape="hexagon", color=purple, fillcolor=purple, fontcolor=white, style=filled]',
  ]));
});

test('generateDotFilesFromPayload and generateDotForActionPayload produce files', async () => {
  const payload: GraphPayload = JSON.parse(await fs.readFile(path.resolve('docs/examples/case2/out/ngrx-graph.json'), 'utf8')) as GraphPayload;
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'ngrx-graph-'));
  registerTempRoot(base);
  const out = path.join(base, 'dot-modules');
  await generateDotFilesFromPayload(payload, out);
  const all = await fs.readFile(path.join(out, 'all.dot'), 'utf8');
  expect(all).toContain('digraph {');
  await generateDotForActionPayload(payload, 'nestedAction1', out);
  const focused = await fs.readFile(path.join(out, 'nestedAction1.dot'), 'utf8');
  expect(focused).toContain('nestedAction1 -> action1 [arrowhead=dot]');
});
