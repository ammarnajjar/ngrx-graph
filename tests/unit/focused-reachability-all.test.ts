import fs from 'fs/promises';
import path from 'path';
import { generateDotForActionPayload } from '../../src/dot/generator';
import { GraphPayload } from '../../src/dot/types';

const examplesDir = path.resolve('docs/examples');

test('focused reachability across examples (smoke)', async () => {
  const files = await fs.readdir(examplesDir);
  const exs: string[] = [];
  for (const f of files) {
    const stat = await fs.stat(path.join(examplesDir, f));
    if (stat.isDirectory()) exs.push(f);
  }
  for (const ex of exs) {
    const jsonPath = path.join(examplesDir, ex, 'out', 'ngrx-graph.json');
    const payload = JSON.parse(await fs.readFile(jsonPath, 'utf8')) as GraphPayload;
    const out = path.resolve('tmp/test-focused-all', ex);
    await fs.mkdir(out, { recursive: true });
    for (const a of payload.allActions) {
      await generateDotForActionPayload(payload, a.name, out);
    }
  }
}, 20000);
