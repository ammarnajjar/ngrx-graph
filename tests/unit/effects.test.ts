import { parseEffectsFromText } from '../../src/scan/effects';

test('detect ofType inputs and map outputs', async () => {
  const src = `class E { effect$ = createEffect(() => this.actions$.pipe(ofType(loadThing), map(() => loadSuccess()))); }`;
  const res = await parseEffectsFromText(src, 'eff.ts');
  const keys = Object.keys(res.mapping);
  expect(keys.length).toBeGreaterThan(0);
  const k = keys[0];
  expect(res.mapping[k].input).toContain('loadThing');
  expect(res.mapping[k].output).toContain('loadSuccess');
});
