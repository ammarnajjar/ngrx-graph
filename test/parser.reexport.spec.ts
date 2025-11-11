import path from 'path';
import { findSourceFiles } from '../src/discovery/file-scanner';
import { parseFiles } from '../src/discovery/parser';

describe('parser re-exports', () => {
  it('finds actions that are re-exported', async () => {
    const src = path.resolve(__dirname, 'fixtures', 'reexport-case');
    const files = await findSourceFiles(src);
    const parsed = parseFiles(files);
    expect(parsed.nodes.find((n) => n.name === 'reAction')).toBeTruthy();
  });
});
