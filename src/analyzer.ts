import fs from 'fs';
import path from 'path';
import type { Structure } from './assembler';

/**
 * Analyze a source directory for NgRx structure.
 * Current minimal implementation: if a `ngrx-graph.json` exists in the parent
 * of `srcDir` it will be used (behaviour described in README as cache).
 */
export async function analyze(srcDir: string, options: { force?: boolean } = {}): Promise<Structure> {
  const parent = path.resolve(srcDir, '..');
  const candidatePaths = [
    path.join(parent, 'ngrx-graph.json'),
    path.join(parent, 'out', 'ngrx-graph.json'),
  ];

  if (!options.force) {
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const raw = await fs.promises.readFile(p, 'utf8');
        try {
          return JSON.parse(raw);
        } catch (err) {
          throw new Error(`Failed to parse structure file at ${p}: ${err}`);
        }
      }
    }
  }

  // TODO: implement full TypeScript parsing using ts-morph to extract actions,
  // components, effects and reducers. For now provide an empty structure.
  return {
    allActions: [],
    fromComponents: {},
    fromEffects: {},
    fromReducers: {},
    loadedActions: [],
  };
}

export default analyze;
