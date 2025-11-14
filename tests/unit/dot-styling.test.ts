import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { generateDotForActionPayload } from '../../src/dot/generator';
import { GraphPayload } from '../../src/dot/types';

describe('dot generator styling', () => {
  it('only colors loadedActions and keeps focused action green', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ngrx-graph-test-'));

    const payload = {
      fromComponents: { CompA: ['focusAction', 'nonLoaded'] },
      fromEffects: {
        eff1: { input: ['focusAction'], output: ['loadedOne', 'nonLoaded2'] }
      },
      loadedActions: [
        { name: 'loadedOne', payloadActions: ['pA', 'orderCompletedDelivery'] }
      ],
      fromReducers: {},
      allActions: [
        { name: 'focusAction', nested: false },
        { name: 'loadedOne', nested: false },
        { name: 'pA', nested: false },
        { name: 'orderCompletedDelivery', nested: false },
        { name: 'nonLoaded', nested: false },
        { name: 'nonLoaded2', nested: false }
      ]
    } as unknown as GraphPayload;

    const dotPath = await generateDotForActionPayload(payload, 'focusAction', tmp);
    const dot = await fs.readFile(dotPath, 'utf8');

    // focused action should be green with specific fillcolor
    expect(dot).toMatch(/focusAction\s*\[.*fillcolor="#007000"/);

    // payload action should have a warm creme fill and the loader should not
    expect(dot).toMatch(/pA\s*\[.*fillcolor="#f5e9d6"/);
    expect(dot).toMatch(/orderCompletedDelivery\s*\[.*fillcolor="#f5e9d6"/);
    expect(dot).not.toMatch(/loadedOne\s*\[.*fillcolor=/);

    // non-loaded actions should NOT have a fillcolor attribute
    expect(dot).not.toMatch(/nonLoaded\s*\[.*fillcolor=/);
    expect(dot).not.toMatch(/nonLoaded2\s*\[.*fillcolor=/);

    // cleanup
    await fs.rm(tmp, { recursive: true, force: true });
  });
});
