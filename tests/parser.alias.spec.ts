import path from 'path';
import { parseActions } from '../src/parser/actions';
import { parseComponents } from '../src/parser/components';
import { parseEffects } from '../src/parser/effects';
import { parseReducers } from '../src/parser/reducers';

describe('parser alias/re-export handling (case4)', () => {
  const base = path.resolve(__dirname, '..', 'docs', 'examples', 'case4', 'src');

  test('actions discovered including re-exported names', () => {
    const actions = parseActions(base).map(a => a.name).sort();
    expect(actions).toEqual(['actionA', 'actionB', 'exportedActionA'].sort());
  });

  test('component dispatch uses exported alias', () => {
    const comps = parseComponents(base);
    expect(comps['Case4Component']).toBeDefined();
    expect(comps['Case4Component']).toContain('exportedActionA');
  });

  test('effects detect ofType and output actions', () => {
    const effects = parseEffects(base);
    const keys = Object.keys(effects);
    expect(keys.length).toBeGreaterThan(0);
    const info = effects[keys[0]];
    expect(info.input).toContain('exportedActionA');
    expect(info.output).toContain('actionB');
  });

  test('reducers handle actionB', () => {
    const reducers = parseReducers(base);
    const anyHandles = Object.values(reducers).some(arr => arr.includes('actionB'));
    expect(anyHandles).toBe(true);
  });
});
