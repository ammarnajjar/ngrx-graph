import fs from 'fs';
import path from 'path';
import analyze from '../src/analyzer';

describe('analyzer (integration)', () => {
  test('loads existing ngrx-graph.json for case2', async () => {
    const exampleDir = path.resolve(__dirname, '..', 'docs', 'examples', 'case2');
    const srcDir = path.join(exampleDir, 'src');

    const expectedRaw = await fs.promises.readFile(path.join(exampleDir, 'out', 'ngrx-graph.json'), 'utf8');
    const expected = JSON.parse(expectedRaw);

    const result = await analyze(srcDir, { force: false });

    expect(result).toEqual(expected);
  });
});
