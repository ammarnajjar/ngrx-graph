import fs from 'fs';
import path from 'path';
import { assemble } from '../src/assembler';

test('assembler produces case1 structure matching fixture', async () => {
  const exampleDir = path.resolve(__dirname, '..', 'docs', 'examples', 'case1');
  const src = path.join(exampleDir, 'src');
  const expectedRaw = await fs.promises.readFile(path.join(exampleDir, 'ngrx-graph.json'), 'utf8');
  const expected = JSON.parse(expectedRaw);

  const result = await assemble(src, { force: false });

  expect(result.allActions.map(a => a.name).sort()).toEqual(expected.allActions.map((a: { name: string }) => a.name).sort());
  expect(result.fromComponents).toEqual(expected.fromComponents);
  expect(result.fromReducers).toEqual(expected.fromReducers);
});
