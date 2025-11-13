import path from 'path';
import { parseReducers } from '../src/parser/reducers';

describe('parseReducers', () => {
  test('case1 reducer handles action3', () => {
    const src = path.resolve(__dirname, '..', 'docs', 'examples', 'case1', 'src');
    const result = parseReducers(src);

    expect(result['firstReducer']).toBeDefined();
    expect(result['firstReducer']).toContain('action3');
  });

  test('case2 reducer handles action3 as well', () => {
    const src = path.resolve(__dirname, '..', 'docs', 'examples', 'case2', 'src');
    const result = parseReducers(src);

    expect(result['firstReducer']).toBeDefined();
    expect(result['firstReducer']).toContain('action3');
  });
});
