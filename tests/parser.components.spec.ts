import path from 'path';
import { parseComponents } from '../src/parser/components';

describe('parseComponents', () => {
  test('detects store.dispatch calls and action creators in case2 component', () => {
    const exampleDir = path.resolve(__dirname, '..', 'docs', 'examples', 'case2', 'src');

    const result = parseComponents(exampleDir);

    expect(result['FirstComponent']).toBeDefined();
    expect(result['FirstComponent']).toContain('nestedAction1');
  });
});
