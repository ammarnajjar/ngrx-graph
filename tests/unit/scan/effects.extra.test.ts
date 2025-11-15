import { parseEffectsFromText } from '../../../src/scan/effects';

describe('parseEffectsFromText - extra cases', () => {
  it('detects ofType and map returning action creators (nested return)', async () => {
    const src = `
      import { createEffect, ofType } from '@ngrx/effects';
      const registerOrderEfr = (p: any) => ({ type: 'x' });
      const otherAction = () => ({ type: 'y' });
      class E {
        a$ = createEffect(() =>
          this.actions$.pipe(
            ofType(someAction),
            map(({ payload }) => {
              if (payload) { return registerOrderEfr({ foo: someCreator() }); }
              return otherAction();
            })
          )
        );
      }
    `;

    const { mapping, loaded } = await parseEffectsFromText(src);
    // debug output

    console.log('DBG1 mapping:', JSON.stringify(mapping));

    console.log('DBG1 loaded:', JSON.stringify(loaded));
    expect(mapping).toHaveProperty('a$');
    expect(mapping.a$.input).toContain('someAction');
    expect(mapping.a$.output).toEqual(expect.arrayContaining(['registerOrderEfr', 'otherAction']));
    expect(loaded.some(l => l.name === 'registerOrderEfr')).toBeTruthy();
  });

  it('detects array literal of actions and captures payload actions', async () => {
    const src = `
      import { createEffect } from '@ngrx/effects';
      const a1 = () => ({type:'a1'});
      const a2 = (p:any) => ({type:'a2'});
      class E { b$ = createEffect(() => this.actions$.pipe(switchMap(()=> [a1(), a2({ foo: innerAction() })]))); }
      function innerAction(){return {}};
    `;

    const { mapping, loaded } = await parseEffectsFromText(src);

    console.log('DBG2 mapping:', JSON.stringify(mapping));

    console.log('DBG2 loaded:', JSON.stringify(loaded));
    // b$ should exist and list a1 and a2 as outputs
    const key = Object.keys(mapping)[0];
    expect(mapping[key].output).toEqual(expect.arrayContaining(['a1', 'a2']));
    // loaded should include a2 with payload innerAction
    expect(loaded.some(l => l.name === 'a2' && l.payloadActions.includes('innerAction'))).toBeTruthy();
  });

  it('detects store.dispatch patterns including object literal type', async () => {
    const src = `
      import { createEffect } from '@ngrx/effects';
      class C {
        c$ = createEffect(() => this.actions$.pipe(map(() => {
          store.dispatch(doSomething());
          store.dispatch({ type: 'LITERAL_TYPE' });
          store.dispatch(creator({ p: inner() }));
          return {};
        })));
      }
      const inner = ()=>({});
      const doSomething = ()=>({});
      const creator = (p:any)=>({});
    `;

    const { mapping, loaded } = await parseEffectsFromText(src);
    // mapping will contain function names mapped by parser (property names)
    const outs = Object.values(mapping).flatMap(v => v.output);
    expect(outs).toEqual(expect.arrayContaining(['doSomething', 'LITERAL_TYPE', 'creator']));
    expect(loaded.some(l => l.name === 'creator' && l.payloadActions.includes('inner'))).toBeTruthy();
  });
});
