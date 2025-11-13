import fs from 'fs';
import path from 'path';
import { assemble } from '../src/assembler';

test('assembler produces case2 structure matching fixture', async () => {
  const exampleDir = path.resolve(__dirname, '..', 'docs', 'examples', 'case2');
  const src = path.join(exampleDir, 'src');
  const expectedRaw = await fs.promises.readFile(path.join(exampleDir, 'ngrx-graph.json'), 'utf8');
  const expected = JSON.parse(expectedRaw);

  const result = await assemble(src, { force: false });

  expect(result.allActions.map(a => a.name).sort()).toEqual(expected.allActions.map((a: { name: string }) => a.name).sort());
  expect(result.fromComponents).toEqual(expected.fromComponents);
  expect(result.fromEffects).toEqual(expected.fromEffects);
  // loadedActions may contain duplicate entries with different payloadActions order — compare sets of tuples
  const expectedLoaded = expected.loadedActions.map((l: { name: string; payloadActions?: string[] }) => `${l.name}:${(l.payloadActions||[]).join(',')}`);
  const resultLoaded = result.loadedActions.map((l: { name: string; payloadActions?: string[] }) => `${l.name}:${(l.payloadActions||[]).join(',')}`);
  expect(new Set(resultLoaded)).toEqual(new Set(expectedLoaded));
});
