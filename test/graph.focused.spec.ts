import path from 'path';
import { findSourceFiles } from '../src/discovery/file-scanner';
import { parseFiles } from '../src/discovery/parser';
import { buildGraph } from '../src/graph/graph-builder';
import { extractSubgraph } from '../src/graph/subgraph';
import { writeStructure } from '../src/serialize/cache';

describe('graph focused', () => {
  it('extracts focused subgraph for nested action', async () => {
    const src = path.resolve(__dirname, 'fixtures', 'nested-actions');
    const files = await findSourceFiles(src);
    const f = files.filter((p) => p.includes('test/fixtures/nested-actions'));
    const parsed = parseFiles(f);
    const graph = buildGraph(parsed.nodes, parsed.edges);
    const struct = { ...graph, generatedAt: new Date().toISOString(), version: '0.0.0' };
    // write to temp dir
    const out = path.resolve('/tmp');
    writeStructure(struct, out, 'tmp-structure.json');
    // try lookup by variable name then display name
    let sub;
    try {
      sub = extractSubgraph(struct, 'action1');
    } catch {
      sub = extractSubgraph(struct, 'Action1');
    }
    expect(sub.nodes.length).toBeGreaterThan(0);
    // ensure nested edges exist (nest) or other edges present
    expect(sub.edges.length).toBeGreaterThan(0);
  });
});
