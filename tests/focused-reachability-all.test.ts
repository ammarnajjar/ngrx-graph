import fs from 'fs/promises';
import path from 'path';
import { generateDotForActionPayload } from '../src/dot/generator';
import { GraphPayload } from '../src/dot/types';
import { createTempDir } from './utils';

const examplesDir = path.resolve('docs/examples');

function computeReachableActions(payload: GraphPayload, actionName: string) {
  const compToActions = payload.fromComponents || {};
  const actionToPredecessors: Record<string, Set<string>> = {};
  const actionToSuccessors: Record<string, Set<string>> = {};

  for (const io of Object.values(payload.fromEffects || {}) as { input: string[]; output: string[] }[]) {
    for (const inp of io.input) for (const outAct of io.output) {
      actionToSuccessors[inp] = actionToSuccessors[inp] ?? new Set();
      actionToSuccessors[inp].add(outAct);
      actionToPredecessors[outAct] = actionToPredecessors[outAct] ?? new Set();
      actionToPredecessors[outAct].add(inp);
    }
  }

  for (const l of (payload.loadedActions || []) as { name: string; payloadActions: string[] }[]) {
    for (const p of (l.payloadActions || []) as string[]) {
      actionToSuccessors[l.name] = actionToSuccessors[l.name] ?? new Set();
      actionToSuccessors[l.name].add(p);
      actionToPredecessors[p] = actionToPredecessors[p] ?? new Set();
      actionToPredecessors[p].add(l.name);
    }
  }

  for (const [comp, actions] of Object.entries(compToActions) as [string, string[]][]) {
    for (const a of actions) {
      actionToPredecessors[a] = actionToPredecessors[a] ?? new Set();
      actionToPredecessors[a].add(comp);
    }
  }

  const actionToReducers: Record<string, Set<string>> = {};
  for (const [r, actions] of Object.entries(payload.fromReducers || {}) as [string, string[]][]) {
    for (const a of actions) {
      actionToSuccessors[a] = actionToSuccessors[a] ?? new Set();
      actionToSuccessors[a].add(r);
      actionToReducers[a] = actionToReducers[a] ?? new Set();
      actionToReducers[a].add(r);
    }
  }

  const backwardActions = new Set<string>();
  const backwardComponents = new Set<string>();
  const bqueue: string[] = [actionName];
  backwardActions.add(actionName);
  while (bqueue.length) {
    const cur = bqueue.shift()!;
    const preds = actionToPredecessors[cur];
    if (!preds) continue;
    for (const p of preds) {
      if (Object.prototype.hasOwnProperty.call(compToActions, p)) { backwardComponents.add(p); continue; }
      if (!backwardActions.has(p)) { backwardActions.add(p); bqueue.push(p); }
    }
  }

  const forwardActions = new Set<string>();
  const fqueue: string[] = [actionName];
  forwardActions.add(actionName);
  const actionNames = new Set((payload.allActions || []).map(x => x.name));
  while (fqueue.length) {
    const cur = fqueue.shift()!;
    const succ = actionToSuccessors[cur];
    if (!succ) continue;
    for (const s of succ) {
      if (!actionNames.has(s)) continue;
      if (!forwardActions.has(s)) { forwardActions.add(s); fqueue.push(s); }
    }
  }

  const included = new Set([...backwardActions, ...forwardActions]);
  // include loaded/payload targets of any included action (generator emits these edges)
  for (const l of (payload.loadedActions || []) as { name: string; payloadActions: string[] }[]) {
    if (included.has(l.name)) {
      for (const p of (l.payloadActions || []) as string[]) included.add(p);
    }
  }
  return included;
}

describe('focused reachability across examples', () => {
  const examples = fs.readdir(examplesDir).then(async files => {
    const out: string[] = [];
    for (const f of files) {
      try {
        const stat = await fs.stat(path.join(examplesDir, f));
        if (stat.isDirectory()) out.push(f);
      } catch {
        // ignore
      }
    }
    return out;
  });

  test('every example: per-action DOTs include only reachable actions', async () => {
    const exs = await examples as string[];
    for (const ex of exs) {
      const jsonPath = path.join(examplesDir, ex, 'out', 'ngrx-graph.json');
      const payload = JSON.parse(await fs.readFile(jsonPath, 'utf8')) as GraphPayload;
      const out = await createTempDir(path.join('test-focused-all', ex));
      for (const a of payload.allActions) {
        await generateDotForActionPayload(payload, a.name, out);
        const dot = await fs.readFile(path.join(out, `${a.name}.dot`), 'utf8');
        const reachable = computeReachableActions(payload, a.name);
        for (const act of payload.allActions.map(x => x.name)) {
          if (reachable.has(act)) expect(dot).toContain(act);
          else expect(dot).not.toContain(act);
        }
      }
    }
  }, 20000);
});
