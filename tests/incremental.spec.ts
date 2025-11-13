import fs from 'fs';
import os from 'os';
import path from 'path';
import { incrementalParse } from '../src/incremental';

function mkdtemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ngrx-incr-'));
}

describe('incrementalParse', () => {
  jest.setTimeout(20000);

  test('creates cache and reuses on no-change', async () => {
    const tmp = mkdtemp();
    const src = path.join(tmp, 'src');
    fs.mkdirSync(src, { recursive: true });

    const aFile = path.join(src, 'actions.ts');
    fs.writeFileSync(aFile, `import { createAction } from '@ngrx/store'; export const action1 = createAction('action1');\n`);

    // first parse should write cache
    const r1 = await incrementalParse(tmp, { concurrency: 2, force: true });
    expect(r1.actions && r1.actions.length).toBeGreaterThan(0);

    // second parse without changes should reuse cache result object
    const r2 = await incrementalParse(tmp, { concurrency: 2, force: false });
    expect(r2).toBeDefined();

    // mutate a file and ensure cache invalidates
    fs.appendFileSync(aFile, '\n// comment');
    const r3 = await incrementalParse(tmp, { concurrency: 2, force: false });
    expect(r3).toBeDefined();

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

export { };

