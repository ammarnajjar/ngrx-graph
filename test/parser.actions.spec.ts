import path from 'path';
import { parseFiles } from '../src/discovery/parser';

describe('parser actions', () => {
  it('parses simple actions and dispatch from component', () => {
    const base = path.resolve(__dirname, 'fixtures', 'simple-case');
    const files = [
      path.join(base, 'actions.ts'),
      path.join(base, 'first.component.ts'),
    ];
    const parsed = parseFiles(files);
  const actionIds = parsed.nodes.filter((n) => n.id.startsWith('Action:')).map((n) => n.name);
  expect(actionIds).toEqual(expect.arrayContaining(['action1', 'action2', 'action3']));
    const dispatchEdges = parsed.edges.filter((e) => e.type === 'dispatch');
    expect(dispatchEdges.length).toBeGreaterThan(0);
  });
});
