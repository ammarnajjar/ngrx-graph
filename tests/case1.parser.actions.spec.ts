import path from 'path';
import { parseActions } from '../src/parser/actions';

describe('case1 parseActions', () => {
  test('detects simple createAction exports in case1', () => {
    const exampleDir = path.resolve(__dirname, '..', 'docs', 'examples', 'case1', 'src');
    const actions = parseActions(exampleDir);
    const map = new Map(actions.map(a => [a.name, a]));

    expect(map.has('action1')).toBe(true);
    expect(map.has('action2')).toBe(true);
    expect(map.has('action3')).toBe(true);

    expect(map.get('action1')!.nested).toBe(false);
  });
});
