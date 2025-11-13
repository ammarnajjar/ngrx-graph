import fg from 'fast-glob';
import path from 'path';
import { generateDotFilesFromJson, generateDotForAction } from '../src/dot-generator';

async function run() {
  const patterns = await fg('docs/examples/*/out/ngrx-graph.json', { onlyFiles: true });
  for (const p of patterns) {
    const dir = path.dirname(p);
    console.log('Generating DOTs for', p);
    // generate the overall all.dot
    await generateDotFilesFromJson(p, dir);
    // also generate focused per-action DOTs (so they contain only relevant nodes)
    const txt = await import('fs/promises').then(m => m.readFile(p, 'utf8'));
    const payload = JSON.parse(txt) as { allActions: Array<{ name: string }> };
    for (const a of payload.allActions || []) {
      await generateDotForAction(p, a.name, dir);
    }
  }
}

run().catch(err => { console.error(err); process.exit(1); });
