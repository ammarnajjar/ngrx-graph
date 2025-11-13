import path from 'path';
import { parseComponents } from '../src/parser/components';

describe('case1 parseComponents', () => {
  test('detects dispatch of action1 in case1 component', () => {
    const exampleDir = path.resolve(__dirname, '..', 'docs', 'examples', 'case1', 'src');
    const result = parseComponents(exampleDir);

    expect(result['FirstComponent']).toBeDefined();
    expect(result['FirstComponent']).toContain('action1');
  });
});
