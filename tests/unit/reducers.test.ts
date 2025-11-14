import { parseReducersFromText } from '../../src/scan/reducers';

test('parse createReducer with on()', async () => {
  const src = `export const r = createReducer(initialState, on(loadThing, (s,a)=>s));`;
  const res = await parseReducersFromText(src, 'r.ts');
  expect(res.mapping.r).toBeDefined();
  expect(res.mapping.r).toContain('loadThing');
});
