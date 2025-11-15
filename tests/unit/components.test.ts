import { parseComponentsFromText } from '../../src/scan/components';

test('parse simple component with action dispatch usage', async () => {
  const src = `class C { dispatch() { this.store.dispatch(loadThing()); } }`;
  const res = await parseComponentsFromText(src, 'c.ts');
  expect(res).toBeDefined();
});

test('detect dispatch in component', async () => {
  const src = `class C { do(){ this.store.dispatch(loadThing()); } }`;
  const res = await parseComponentsFromText(src, 'comp.ts');
  const keys = Object.keys(res.mapping);
  expect(keys.length).toBeGreaterThan(0);
  const first = res.mapping[keys[0]];
  expect(first).toContain('loadThing');
});
