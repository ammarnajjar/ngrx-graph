import path from 'path';
import { parseActions } from '../src/parser/actions';

describe('case3 parseActions', () => {
  test('detects actions in case3', () => {
    const exampleDir = path.resolve(__dirname, '..', 'docs', 'examples', 'case3', 'src');
    const actions = parseActions(exampleDir);
    const map = new Map(actions.map(a => [a.name, a]));

    expect(map.has('action1')).toBe(true);
    expect(map.has('action2')).toBe(true);
    expect(map.has('action3')).toBe(true);
  });
});
