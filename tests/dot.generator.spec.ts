import path from 'path';
import { assemble } from '../src/assembler';
import generateDotFromJson from '../src/dot/fromJson';

describe('dot generator', () => {
  test('generates dot for action1 in case2 and highlights it', async () => {
    const exampleDir = path.resolve(__dirname, '..', 'docs', 'examples', 'case2');
    const src = path.join(exampleDir, 'src');
    const struct = await assemble(src, { force: true });

  const dot = generateDotFromJson(struct, 'action1', { highlightAction: 'action1', highlightColor: '#007000' });

    // component node and edge (IDs are now unprefixed and sanitized)
    expect(dot).toContain('FirstComponent');
    expect(dot).toContain('action1');

  // reducer node
  expect(dot).toContain('firstReducer');

  // effects are represented as direct action->action edges (no effect nodes)
  expect(dot).toContain('action1 -> nestedAction1');
  expect(dot).toContain('action1 -> action3');

    // highlight
  expect(dot).toContain('action1');
    expect(dot).toContain('fillcolor="#007000"');
  });
});
