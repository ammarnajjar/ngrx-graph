import path from 'path';
import { parseActions } from '../src/parser/actions';

describe('parseActions', () => {
  test('detects createAction exports and nested props from case2', () => {
    const exampleDir = path.resolve(__dirname, '..', 'docs', 'examples', 'case2', 'src');

    const actions = parseActions(exampleDir);

    // convert to map for easier assertions
    const map = new Map(actions.map(a => [a.name, a]));

    expect(map.has('nestedAction1')).toBe(true);
    expect(map.has('nestedAction2')).toBe(true);
    expect(map.has('action1')).toBe(true);
    expect(map.has('action2')).toBe(true);
    expect(map.has('action3')).toBe(true);

    expect(map.get('nestedAction1')!.nested).toBe(true);
    expect(map.get('nestedAction2')!.nested).toBe(true);
    expect(map.get('action1')!.nested).toBe(false);
  });
});
