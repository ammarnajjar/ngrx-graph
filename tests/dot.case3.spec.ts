import path from 'path';
import { assemble } from '../src/assembler';
import generateDotFromJson from '../src/dot/fromJson';

describe('case3 dot generation', () => {
  test('action1 graph does not include firstReducer', async () => {
    const exampleDir = path.resolve(__dirname, '..', 'docs', 'examples', 'case3');
    const src = path.join(exampleDir, 'src');
    const struct = await assemble(src, { force: true });

    const dot = generateDotFromJson(struct, 'action1', { highlightAction: 'action1', highlightColor: '#007000' });
    expect(dot).toContain('action1');
    expect(dot).not.toContain('firstReducer');
  });

  test('action2 graph does not include firstReducer', async () => {
    const exampleDir = path.resolve(__dirname, '..', 'docs', 'examples', 'case3');
    const src = path.join(exampleDir, 'src');
    const struct = await assemble(src, { force: true });

    const dot = generateDotFromJson(struct, 'action2', { highlightAction: 'action2', highlightColor: '#007000' });
    expect(dot).toContain('action2');
    expect(dot).not.toContain('firstReducer');
  });

  test('action3 graph includes firstReducer', async () => {
    const exampleDir = path.resolve(__dirname, '..', 'docs', 'examples', 'case3');
    const src = path.join(exampleDir, 'src');
    const struct = await assemble(src, { force: true });

    const dot = generateDotFromJson(struct, 'action3', { highlightAction: 'action3', highlightColor: '#007000' });
    expect(dot).toContain('action3');
    expect(dot).toContain('firstReducer');
  });
});
