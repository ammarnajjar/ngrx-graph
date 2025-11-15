import fs from 'fs/promises';
import path from 'path';
import { dedupeLines } from './edges';
import { GraphPayload } from './types';

export async function generateDotForActionPayload(payload: GraphPayload, actionName: string, out: string) {
  const compToActions = payload.fromComponents || {};
  const actionToPredecessors: Record<string, Set<string>> = {};
  const actionToSuccessors: Record<string, Set<string>> = {};

  function ensureSet(val: unknown): Set<string> {
    if (val instanceof Set) return val as Set<string>;
    if (Array.isArray(val)) return new Set(val as string[]);
    return new Set<string>();
  }

  for (const io of Object.values(payload.fromEffects || {})) {
    for (const inp of io.input)
      for (const outAct of io.output) {
        actionToSuccessors[inp] = ensureSet(actionToSuccessors[inp]);
        actionToSuccessors[inp].add(outAct);

        actionToPredecessors[outAct] = ensureSet(actionToPredecessors[outAct]);
        actionToPredecessors[outAct].add(inp);
      }
  }

  for (const l of payload.loadedActions || []) {
    for (const p of l.payloadActions) {
      actionToSuccessors[l.name] = actionToSuccessors[l.name] ?? new Set();
      actionToSuccessors[l.name].add(p);

      actionToPredecessors[p] = actionToPredecessors[p] ?? new Set();
      actionToPredecessors[p].add(l.name);
    }
  }

  for (const [comp, actions] of Object.entries(compToActions)) {
    for (const a of actions) {
      actionToPredecessors[a] = actionToPredecessors[a] ?? new Set();
      actionToPredecessors[a].add(comp);
    }
  }

  const actionToReducers: Record<string, Set<string>> = {};
  for (const [r, actions] of Object.entries(payload.fromReducers || {})) {
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
      if (Object.prototype.hasOwnProperty.call(compToActions, p)) {
        backwardComponents.add(p);
        continue;
      }
      if (!backwardActions.has(p)) {
        backwardActions.add(p);
        bqueue.push(p);
      }
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
      if (!forwardActions.has(s)) {
        forwardActions.add(s);
        fqueue.push(s);
      }
    }
  }

  const includedActions = new Set<string>([...backwardActions, ...forwardActions]);
  const includedComponents = new Set<string>([...backwardComponents]);

  const includedReducers = new Set<string>();
  for (const a of Array.from(includedActions)) {
    const reds = actionToReducers[a];
    if (reds) for (const r of reds) includedReducers.add(r);
  }

  const lines: string[] = ['digraph {'];
  for (const c of includedComponents)
    lines.push(`${c} [shape="box", color=blue, fillcolor=blue, fontcolor=white, style=filled]`);
  const loadedActionNames = new Set((payload.loadedActions || []).map(l => l.name));

  const payloadActionNames = new Set<string>();
  for (const l of payload.loadedActions || []) {
    for (const p of l.payloadActions) payloadActionNames.add(p);
  }
  for (const a of payload.allActions) {
    if (!includedActions.has(a.name)) continue;
    if (a.name === actionName) {
      lines.push(`${a.name} [color=green, fillcolor="#007000", fontcolor=white, style=filled]`);
    } else if (payloadActionNames.has(a.name)) {
      lines.push(`${a.name} [fillcolor="#f5e9d6", style=filled]`);
    } else if (loadedActionNames.has(a.name)) {
      lines.push(`${a.name}`);
    } else {
      lines.push(`${a.name}`);
    }
  }
  for (const r of includedReducers)
    lines.push(`${r} [shape="hexagon", color=purple, fillcolor=purple, fontcolor=white, style=filled]`);

  for (const c of includedComponents) {
    const acts = compToActions[c] || [];
    for (const a of acts) if (includedActions.has(a)) lines.push(`${c} -> ${a}`);
  }

  for (const a of Array.from(includedActions)) {
    const succ = actionToSuccessors[a];
    if (!succ) continue;
    for (const s of succ) {
      if (payload.loadedActions && payload.loadedActions.some(l => l.name === a && l.payloadActions.includes(s))) {
        lines.push(`${a} -> ${s} [arrowhead=dot]`);
      } else if (includedActions.has(s)) {
        lines.push(`${a} -> ${s}`);
      } else if (includedReducers.has(s)) {
        lines.push(`${a} -> ${s}`);
      }
    }
  }

  for (const a of Array.from(includedActions)) {
    const reds = actionToReducers[a];
    if (!reds) continue;
    for (const r of reds) lines.push(`${a} -> ${r}`);
  }

  lines.push('}');
  await fs.writeFile(path.join(out, `${actionName}.dot`), dedupeLines(lines).join('\n'), 'utf8');
  return path.join(out, `${actionName}.dot`);
}

export async function generateDotForAction(jsonPath: string, actionName: string, outDir?: string) {
  const txt = await fs.readFile(jsonPath, 'utf8');
  const payload = JSON.parse(txt) as GraphPayload;
  const out = outDir ? path.resolve(outDir) : path.dirname(path.resolve(jsonPath));
  await fs.mkdir(out, { recursive: true });
  return generateDotForActionPayload(payload, actionName, out);
}
