import { parseActionsFromText } from '../../../src/scan/actions';

test('parse createActionGroup events and props', async () => {
  const src = `
    const MyGroup = createActionGroup({
      source: 'X',
      events: {
        load: props<{ id: string }>(),
        success: props<{ data: any }>(),
        plain: 'PLAIN'
      }
    });
  `;
  const res = await parseActionsFromText(src, 'a.ts');
  expect(res.some(r => r.kind === 'createActionGroup' && r.name === 'load')).toBeTruthy();
  expect(res.some(r => r.kind === 'createActionGroup' && r.name === 'success' && r.hasProps)).toBeTruthy();
  expect(res.some(r => r.kind === 'createActionGroup' && r.name === 'plain')).toBeTruthy();
});

test('parse nested createAction and class action', async () => {
  const src = `
    const actions = {
      nested: createAction('NESTED')
    };

    export class MyAction {
      readonly type = 'MY_ACTION';
    }
  `;
  const res = await parseActionsFromText(src, 'a2.ts');
  expect(res.some(r => r.name === 'nested' && r.nested)).toBeTruthy();
  expect(res.some(r => r.kind === 'class' && r.name === 'MyAction')).toBeTruthy();
});
