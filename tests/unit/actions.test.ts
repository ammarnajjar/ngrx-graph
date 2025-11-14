import { parseActionsFromText } from '../../src/scan/actions';

test('parse simple createAction', async () => {
  const src = `export const loadThing = createAction('[Thing] Load');`;
  const res = await parseActionsFromText(src, 'a.ts');
  expect(res).toHaveLength(1);
  expect(res[0].name).toBe('loadThing');
  expect(res[0].kind).toBe('createAction');
  expect(res[0].type).toBe("[Thing] Load");
});

test('parse createAction with props and detect propsTypeText', async () => {
  const src = `export const update = createAction('[Thing] Update', props<{ payload: OtherAction }>());`;
  const res = await parseActionsFromText(src, 'b.ts');
  expect(res).toHaveLength(1);
  expect(res[0].hasProps).toBeTruthy();
  expect(res[0].propsTypeText).toBeDefined();
});

test('parse createActionGroup', async () => {
  const src = `export const group = createActionGroup({ source: 'G', events: { 'one': props<{a:number}>() } });`;
  const res = await parseActionsFromText(src, 'c.ts');
  expect(res.length).toBeGreaterThan(0);
  expect(res[0].kind).toBe('createActionGroup');
});
