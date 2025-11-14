import path from 'path';
import { parseReducersFromText } from '../../../src/scan/reducers';

describe('parseReducersFromText', () => {
  it('parses createReducer variable with on handlers', async () => {
    const src = `
      import { createReducer, on } from '@ngrx/store';
      import { actionA, actionB, actionC } from './actions';

      export const myReducer = createReducer(
        {},
        on(actionA, (s) => s),
        on([actionB, actionC], (s) => s)
      );
    `;

    const { mapping } = await parseReducersFromText(src, 'file.ts');
    expect(mapping).toHaveProperty('myReducer');
    expect(mapping.myReducer).toEqual(expect.arrayContaining(['actionA', 'actionB', 'actionC']));
  });

  it('falls back to top-level on() calls when no createReducer variable is present', async () => {
    const src = `
      import { on } from '@ngrx/store';
      import { x, y } from './actions';

      // top-level on calls without a createReducer variable
      on(x, (s) => s);
      on([y], (s) => s);
    `;

    const fileName = 'fallback-file.ts';
    const { mapping } = await parseReducersFromText(src, fileName);
    // chosen key should be based on filename when no exported reducer variable found
    const expectedKey = path.basename(fileName, '.ts');
    expect(Object.keys(mapping)).toContain(expectedKey);
    expect(mapping[expectedKey]).toEqual(expect.arrayContaining(['x', 'y']));
  });
});
