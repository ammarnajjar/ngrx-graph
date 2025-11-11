import path from 'path';
import { parseFiles } from '../src/discovery/parser';

describe('parser effects', () => {
  it('parses effect ofType listening and emits', () => {
    const base = path.resolve(__dirname, 'fixtures', 'simple-case');
    const files = [path.join(base, 'effects.ts'), path.join(base, 'actions.ts')];
    const parsed = parseFiles(files);
    const listen = parsed.edges.filter((e) => e.type === 'listen');
    expect(listen.length).toBeGreaterThan(0);
  });
});
