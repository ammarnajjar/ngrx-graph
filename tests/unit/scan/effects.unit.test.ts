import { parseEffectsFromText } from '../../../src/scan/effects';

test('detects ofType inputs and map output actions', async () => {
  const src = `
    class X {
      some$ = createEffect(() => this.actions$.pipe(ofType(loadItems), map(() => itemsLoaded())));
    }
  `;
  const res = await parseEffectsFromText(src);
  const mapping = res.mapping as Record<string, { input: string[]; output: string[] }>;
  const loaded = res.loaded as Array<{ name: string; payloadActions: string[] }>;
  expect(mapping.some$).toBeDefined();
  expect(mapping.some$.input).toContain('loadItems');
  expect(mapping.some$.output).toContain('itemsLoaded');
  expect(loaded.length).toBe(0);
});

test('extracts payload actions from object literal in map handler', async () => {
  const src = `
    class Y {
      a$ = createEffect(() => this.actions$.pipe(ofType(aIn), mergeMap(() => someAction({ payload: nestedAction() }))));
    }
  `;
  const res = await parseEffectsFromText(src);
  const mapping = res.mapping as Record<string, { input: string[]; output: string[] }>;
  const loaded = res.loaded as Array<{ name: string; payloadActions: string[] }>;
  expect(mapping.a$).toBeDefined();
  expect(mapping.a$.output).toContain('someAction');
  expect(
    loaded.some(
      (l: { name: string; payloadActions: string[] }) =>
        l.name === 'someAction' && l.payloadActions.includes('nestedAction'),
    ),
  ).toBeTruthy();
});

test('handles store.dispatch with object-literal payloads and identifier dispatch', async () => {
  const src = `
    class Z {
      z$ = createEffect(() => this.actions$.pipe(ofType(zIn), map(() => { this.store.dispatch(otherAction({ a: nested()})); return another(); })))
    }
  `;
  const res = await parseEffectsFromText(src);
  const mapping = res.mapping as Record<string, { input: string[]; output: string[] }>;
  const loaded = res.loaded as Array<{ name: string; payloadActions: string[] }>;
  expect(mapping.z$).toBeDefined();
  expect(mapping.z$.output).toContain('otherAction');
  expect(
    loaded.some(
      (l: { name: string; payloadActions: string[] }) =>
        l.name === 'otherAction' && l.payloadActions.includes('nested'),
    ),
  ).toBeTruthy();
});

test('array literal of actions is parsed and payloads extracted', async () => {
  const src = `
    class A {
      a$ = createEffect(() => this.actions$.pipe(ofType(aIn), map(() => [one({ p: p1() }), two(), three({ q: q1() })])));
    }
  `;
  const res = await parseEffectsFromText(src);
  const mapping = res.mapping as Record<string, { input: string[]; output: string[] }>;
  const loaded = res.loaded as Array<{ name: string; payloadActions: string[] }>;
  expect(mapping.a$).toBeDefined();
  expect(mapping.a$.output).toEqual(expect.arrayContaining(['one', 'two', 'three']));
  expect(
    loaded.some((l: { name: string; payloadActions: string[] }) => l.name === 'one' && l.payloadActions.includes('p1')),
  ).toBeTruthy();
  expect(
    loaded.some(
      (l: { name: string; payloadActions: string[] }) => l.name === 'three' && l.payloadActions.includes('q1'),
    ),
  ).toBeTruthy();
});
