import { parseComponentsFromText } from '../../src/scan/components';

test('parse simple component with action dispatch usage', async () => {
  const src = `class C { dispatch() { this.store.dispatch(loadThing()); } }`;
  const res = await parseComponentsFromText(src, 'c.ts');
  expect(res).toBeDefined();
});
