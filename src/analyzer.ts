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
  const structurePath = path.join(parent, 'ngrx-graph.json');

  if (!options.force && fs.existsSync(structurePath)) {
    const raw = await fs.promises.readFile(structurePath, 'utf8');
    try {
      return JSON.parse(raw);
    } catch (err) {
      throw new Error(`Failed to parse structure file at ${structurePath}: ${err}`);
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
