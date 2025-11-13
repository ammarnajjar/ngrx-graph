import { dedupeLines, makeEdges } from '../src/dot/edges';

test('dedupeLines removes duplicates and preserves order', () => {
  const lines = ['a', 'b', 'a', 'c', 'b'];
  expect(dedupeLines(lines)).toEqual(['a', 'b', 'c']);
});

test('makeEdges includes payload arrowhead entries', () => {
  const payload = {
    allActions: [{ name: 'a' }, { name: 'b' }],
    fromComponents: {},
    fromEffects: {},
    fromReducers: {},
    loadedActions: [{ name: 'a', payloadActions: ['b'] }],
  } as any;
  const edges = makeEdges(payload);
  expect(edges).toContain('a -> b [arrowhead=dot]');
});
