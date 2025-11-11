import path from 'path';
import { findSourceFiles } from '../src/discovery/file-scanner';
import { parseFiles } from '../src/discovery/parser';

describe('parser alias imports', () => {
  it('resolves aliased imports for createAction and uses canonical names', async () => {
    const src = path.resolve(__dirname, 'fixtures', 'alias-case');
    const files = await findSourceFiles(src);
    const parsed = parseFiles(files);
    // expect an action node for aliasAction
    expect(parsed.nodes.find((n) => n.name === 'aliasAction')).toBeTruthy();
  });
});
