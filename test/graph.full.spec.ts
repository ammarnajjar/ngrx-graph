import path from 'path';
import { findSourceFiles } from '../src/discovery/file-scanner';
import { parseFiles } from '../src/discovery/parser';
import { buildGraph } from '../src/graph/graph-builder';

describe('graph full', () => {
  it('builds a full graph with actions, effects, reducers and components', async () => {
    const src = path.resolve(__dirname, 'fixtures', 'simple-case');
    const files = await findSourceFiles(src);
    // only pick the fixture files we created
    const f = files.filter((p) => p.includes('test/fixtures/simple-case'));
    const parsed = parseFiles(f);
    const graph = buildGraph(parsed.nodes, parsed.edges);
  expect(graph.nodes.find((n) => n.name === 'action1')).toBeTruthy();
  expect(graph.edges.some((e) => e.type === 'dispatch')).toBeTruthy();
  expect(graph.edges.some((e) => e.type === 'listen')).toBeTruthy();
  expect(graph.edges.some((e) => e.type === 'emit')).toBeTruthy();
  });
});
