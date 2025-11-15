import { parseReducersFromText } from '../../../src/scan/reducers';

test('parses createReducer with on(array) entries', async () => {
  const src = `
    const r = createReducer({}, on([a1, a2], (s, a) => s));
  `;
  const { mapping } = await parseReducersFromText(src, 'rfile.ts');
  expect(mapping.r).toBeDefined();
  expect(mapping.r).toEqual(expect.arrayContaining(['a1', 'a2']));
});

test('parses createReducer with multiple on args', async () => {
  const src = `
    const r = createReducer({}, on(a1, a2, (s,a)=>s));
  `;
  const { mapping } = await parseReducersFromText(src, 'rfile2.ts');
  expect(mapping.r).toBeDefined();
  expect(mapping.r).toEqual(expect.arrayContaining(['a1', 'a2']));
});

test('uses exported variable name for key when no reducer variables discovered', async () => {
  const src = `
    export const myReducer = something;
    on(aX, (s,a)=>s);
  `;
  const { mapping } = await parseReducersFromText(src, 'exported.ts');
  expect(mapping.myReducer).toBeDefined();
  expect(mapping.myReducer).toContain('aX');
});

test('falls back to file basename when no exported variable present', async () => {
  const src = `
    // global on call
    on(one, two);
  `;
  const { mapping } = await parseReducersFromText(src, '/some/path/foo.reducer.ts');
  expect(mapping['foo.reducer']).toBeDefined();
  expect(mapping['foo.reducer']).toEqual(expect.arrayContaining(['one', 'two']));
});
