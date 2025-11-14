import { parseComponentsFromText } from '../../../src/scan/components';

test('detect simple identifier dispatch', async () => {
  const src = `
    class C { method() { this.store.dispatch(SimpleAction); } }
  `;
  const res = await parseComponentsFromText(src, 'c.ts');
  const keys = Object.keys(res.mapping);
  expect(keys.length).toBeGreaterThan(0);
  const cls = keys[0];
  expect(res.mapping[cls]).toContain('SimpleAction');
});

test('detect object-literal action with type property', async () => {
  const src = `
    class C2 { do() { this.store.dispatch({ type: 'SOME_TYPE' }); } }
  `;
  const res = await parseComponentsFromText(src, 'c2.ts');
  const keys = Object.keys(res.mapping);
  expect(keys.length).toBeGreaterThan(0);
  const cls = keys[0];
  expect(res.mapping[cls]).toContain('SOME_TYPE');
});

test('detect alternate store variable name', async () => {
  const src = `
    class C3 { constructor(private s: any) {} run() { this.s.dispatch(doThing); } }
  `;
  const res = await parseComponentsFromText(src, 'c3.ts');
  const keys = Object.keys(res.mapping);
  expect(keys.length).toBeGreaterThan(0);
  const cls = keys[0];
  expect(res.mapping[cls]).toContain('doThing');
});
