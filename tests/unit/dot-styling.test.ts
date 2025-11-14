import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { generateDotForActionPayload } from '../../src/dot/generator';

describe('dot generator styling', () => {
  it('only colors loadedActions and keeps focused action green', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ngrx-graph-test-'));

    const payload = {
      fromComponents: { CompA: ['focusAction', 'nonLoaded'] },
      fromEffects: {
        eff1: { input: ['focusAction'], output: ['loadedOne', 'nonLoaded2'] }
      },
      loadedActions: [
        { name: 'loadedOne', payloadActions: ['pA'] }
      ],
      fromReducers: {},
      allActions: [
        { name: 'focusAction', nested: false },
        { name: 'loadedOne', nested: false },
        { name: 'nonLoaded', nested: false },
        { name: 'nonLoaded2', nested: false }
      ]
    } as any;

    const dotPath = await generateDotForActionPayload(payload, 'focusAction', tmp);
    const dot = await fs.readFile(dotPath, 'utf8');

    // focused action should be green with specific fillcolor
    expect(dot).toMatch(/focusAction\s*\[.*fillcolor="#007000"/);

    // loaded action should have a fillcolor (linen)
    expect(dot).toMatch(/loadedOne\s*\[.*fillcolor=linen/);

    // non-loaded actions should NOT have a fillcolor attribute
    expect(dot).not.toMatch(/nonLoaded\s*\[.*fillcolor=/);
    expect(dot).not.toMatch(/nonLoaded2\s*\[.*fillcolor=/);

    // cleanup
    await fs.rm(tmp, { recursive: true, force: true });
  });
});
