import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';
import { Project, SyntaxKind } from 'ts-morph';
import incrementalParse from './incremental';
import { parseActions } from './parser/actions';
import { parseComponents } from './parser/components';
import { parseEffects } from './parser/effects';
import { parseReducers } from './parser/reducers';

export type Structure = {
  allActions: Array<{ name: string; nested: boolean }>;
  fromComponents: Record<string, string[]>;
  fromEffects: Record<string, { input: string[]; output: string[] }>;
  fromReducers: Record<string, string[]>;
  loadedActions: Array<{ name: string; payloadActions?: string[] }>;
};

/**
 * Assemble structure using parsers. If a structure file exists in parent of srcDir, load that instead
 * (mimic README behavior) unless force=true.
 */
export async function assemble(srcDir: string, options: { force?: boolean; propagateLoadedActions?: boolean; fast?: boolean; verbose?: boolean } = {}): Promise<Structure> {
  const parent = path.resolve(srcDir, '..');
  const structPath = path.join(parent, 'ngrx-graph.json');
  if (!options.force && fs.existsSync(structPath)) {
    const raw = await fs.promises.readFile(structPath, 'utf8');
    return JSON.parse(raw) as Structure;
  }

  let actions: Array<{ name: string; nested: boolean }> = [];
  let components: Record<string, string[]> = {};
  let effects: Record<string, { input: string[]; output: string[] }> = {};
  let reducers: Record<string, string[]> = {};

  if (options.fast) {
    if (options.verbose) console.log('assemble: running incremental (fast) parse');
    const r = await incrementalParse(srcDir, { force: options.force, verbose: options.verbose });
    actions = r.actions;
    components = r.components;
    effects = r.effects;
    reducers = r.reducers;
  } else {
    if (options.verbose) console.log('assemble: running full parsers (non-fast)');
    actions = parseActions(srcDir);
    if (options.verbose) console.log(`assemble: collected actions=${actions.length}`);
    components = parseComponents(srcDir);
    effects = parseEffects(srcDir);
    reducers = parseReducers(srcDir);
    if (options.verbose) console.log(`assemble: collected components=${Object.keys(components).length}`);
    if (options.verbose) console.log(`assemble: collected effects=${Object.keys(effects).length}`);
    if (options.verbose) console.log(`assemble: collected reducers=${Object.keys(reducers).length}`);
  }

  // Detect nested action payloads by scanning source files for calls to nested action creators
  const loadedActions: Array<{ name: string; payloadActions?: string[] }> = [];
  const project = new Project({ tsConfigFilePath: undefined });
  let sourceFiles = [] as import('ts-morph').SourceFile[];
  if (options.fast) {
    if (options.verbose) console.log('assemble: fast mode - prefiltering source files for nested action detection');
    const patterns = [
      '**/*.component.ts',
      '**/*.effects.ts',
      '**/*.reducer.ts',
      '**/*.actions.ts',
      '!**/*.d.ts',
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/out/**',
    ];
    const entries = await fg(patterns, { cwd: srcDir, absolute: true });
    sourceFiles = project.addSourceFilesAtPaths(entries);
  } else {
    const globPath = path.join(srcDir, '**', '*.ts');
    sourceFiles = project.addSourceFilesAtPaths(globPath);
  }

  const nestedActionNames = new Set(actions.filter(x => x.nested).map(x => x.name));

  for (const sf of sourceFiles) {
    const calls = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of calls) {
      const expr = call.getExpression();
      if (!expr) continue;
      const callee = expr.getText();
      if (!nestedActionNames.has(callee)) continue;

      const args = call.getArguments();
      if (!args || args.length === 0) continue;
      const first = args[0];
      if (first.getKind && first.getKind() === SyntaxKind.ObjectLiteralExpression) {
        const obj = first as import('ts-morph').ObjectLiteralExpression;
        const props = obj.getProperties();
        for (const p of props) {
          if (p.getKind && p.getKind() === SyntaxKind.PropertyAssignment) {
            const propAssign = p as import('ts-morph').PropertyAssignment;
            const name = propAssign.getName();
            if (name !== 'action') continue;
            const init = propAssign.getInitializer && propAssign.getInitializer();
            if (!init) continue;
            if (init.getKind && init.getKind() === SyntaxKind.CallExpression) {
              const inner = init as import('ts-morph').CallExpression;
              const innerName = inner.getExpression().getText();
              // only record payload actions that are known action creators
              if (nestedActionNames.has(innerName) || actions.some(a => a.name === innerName)) {
                loadedActions.push({ name: callee, payloadActions: [innerName] });
              }
            }
          }
        }
      }
    }
  }

  return {
    allActions: actions.map(a => ({ name: a.name, nested: a.nested })),
    fromComponents: components,
    fromEffects: effects,
    fromReducers: reducers,
    // loadedActions: keep as-discovered unless propagateLoadedActions option is true
    loadedActions: (() => {
      if (!options.propagateLoadedActions) return loadedActions;

      const map = new Map<string, Set<string>>();
      for (const l of loadedActions) {
        if (!map.has(l.name)) map.set(l.name, new Set());
        for (const p of l.payloadActions || []) map.get(l.name)!.add(p);
      }

      let changed = true;
      while (changed) {
        changed = false;
        for (const [, info] of Object.entries(effects)) {
          for (const inA of info.input) {
            const inSet = map.get(inA);
            if (!inSet || inSet.size === 0) continue;
            for (const outA of info.output) {
              if (!map.has(outA)) map.set(outA, new Set());
              const outSet = map.get(outA)!;
              const before = outSet.size;
              for (const v of inSet) outSet.add(v);
              if (outSet.size !== before) changed = true;
            }
          }
        }
      }

      const out: Array<{ name: string; payloadActions?: string[] }> = [];
      for (const [k, s] of map.entries()) {
        out.push({ name: k, payloadActions: Array.from(s) });
      }
      return out;
    })(),
  };
}

export default assemble;
