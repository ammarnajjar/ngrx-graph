import { parseComponentsFromText } from '../../../src/scan/components';

test('detect dispatched action creator addVouchers with payload actions', async () => {
  const src = `
    import { Component } from '@angular/core';
    @Component({ selector: 'x', template: '' })
    export class SomeComponent {
      constructor(private store: any) {}
      someMethod() {
        this.store.dispatch(addVouchers({ items: createItem(), id: makeId() }));
      }
    }
  `;

  const res = await parseComponentsFromText(src, 'some.component.ts');
  const keys = Object.keys(res.mapping);
  expect(keys.length).toBeGreaterThan(0);
  const cls = keys[0];
  expect(res.mapping[cls]).toContain('addVouchers');
  // loaded should contain payloadActions referencing createItem and makeId
  const found = res.loaded.find(l => l.name === 'addVouchers');
  expect(found).toBeDefined();
  expect(found?.payloadActions).toEqual(expect.arrayContaining(['createItem', 'makeId']));
});
