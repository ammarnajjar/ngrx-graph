import path from 'path';
import { parseEffects } from '../src/parser/effects';

describe('parseEffects', () => {
  test('case1 effect: detects input action1 and outputs action2, action3', () => {
    const src = path.resolve(__dirname, '..', 'docs', 'examples', 'case1', 'src');
    const result = parseEffects(src);

    // effect name is effect1$
    expect(result['effect1$']).toBeDefined();
    expect(result['effect1$'].input).toContain('action1');
    expect(result['effect1$'].output).toEqual(expect.arrayContaining(['action2', 'action3']));
  });

  test('case2 effects: nested action flows detected', () => {
    const src = path.resolve(__dirname, '..', 'docs', 'examples', 'case2', 'src');
    const result = parseEffects(src);

    expect(result['effect1$']).toBeDefined();
    expect(result['effect1$'].input).toContain('action1');
    expect(result['effect1$'].output).toEqual(expect.arrayContaining(['nestedAction1', 'action3']));

    expect(result['effect2$']).toBeDefined();
    expect(result['effect2$'].input).toContain('nestedAction1');
    expect(result['effect2$'].output).toEqual(expect.arrayContaining(['nestedAction2']));

    expect(result['effect3$']).toBeDefined();
    expect(result['effect3$'].input).toContain('nestedAction2');
  // effect3 may output a payload action that can't be resolved to a named creator; ensure output is an array
  expect(Array.isArray(result['effect3$'].output)).toBe(true);
  });
});
