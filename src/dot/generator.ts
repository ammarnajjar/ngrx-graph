import { Structure } from '../assembler';

export type DotOptions = { highlightAction?: string; highlightColor?: string };

function escapeLabel(s: string) {
  return s.replace(/"/g, '\\"');
}

function sanitizeId(s: string) {
  // remove/replace characters that would break ID usage, keep readable
  return s.replace(/"/g, '').replace(/\s+/g, '_');
}

export function generateDotForAction(struct: Structure, actionName: string, opts: DotOptions = {}): string {
  const lines: string[] = [];
  const { highlightAction, highlightColor = '#007000' } = { ...opts, highlightAction: actionName };

  lines.push('digraph G {');
  lines.push('  rankdir=LR;');
  lines.push('  node [shape=box, style=filled, fillcolor="#ffffff"];');

  // Add component nodes and edges: component -> action (use unprefixed ids)
  for (const [comp, actions] of Object.entries(struct.fromComponents)) {
    const compId = sanitizeId(comp);
    lines.push(`  ${compId} [label="${escapeLabel(comp)}", shape=component];`);
    for (const a of actions) {
      const actId = sanitizeId(a);
      lines.push(`  ${compId} -> ${actId};`);
    }
  }

  // Build action adjacency from effects (in -> outs)
  const actionAdj = new Map<string, Set<string>>();
  for (const a of struct.allActions) actionAdj.set(a.name, new Set<string>());
  for (const [, info] of Object.entries(struct.fromEffects)) {
    for (const inA of info.input) {
      if (!actionAdj.has(inA)) actionAdj.set(inA, new Set<string>());
      const set = actionAdj.get(inA)!;
      for (const outA of info.output) {
        if (outA === '__PAYLOAD__') continue;
        set.add(outA);
      }
    }
  }

  // Collect direct payload relations from loadedActions (no propagation)
  const payloadMap = new Map<string, Set<string>>();
  if (Array.isArray(struct.loadedActions)) {
    for (const l of struct.loadedActions) {
      const name = String(l.name);
      const payloads: string[] = l.payloadActions || [];
      if (!payloadMap.has(name)) payloadMap.set(name, new Set());
      for (const p of payloads) payloadMap.get(name)!.add(String(p));
    }
  }

  // Determine reachable actions from the selected action via both forward (descendants) and backward (ancestors) traversal
  const selected = highlightAction || actionName;
  const reachable = new Set<string>();

  // build reverse adjacency so we can walk upstream
  const revAdj = new Map<string, Set<string>>();
  for (const [inA, outs] of actionAdj) {
    for (const outA of outs) {
      if (!revAdj.has(outA)) revAdj.set(outA, new Set());
      revAdj.get(outA)!.add(inA);
    }
  }
  for (const [from, set] of payloadMap.entries()) {
    for (const p of set) {
      if (!revAdj.has(p)) revAdj.set(p, new Set());
      revAdj.get(p)!.add(from);
    }
  }

  const q: string[] = [selected];
  reachable.add(selected);
  while (q.length) {
    const cur = q.shift()!;
    // forward: effects
    const outs = actionAdj.get(cur) || new Set<string>();
    for (const o of outs) {
      if (!reachable.has(o)) {
        reachable.add(o);
        q.push(o);
      }
    }
    // forward: payloads
    const pset = payloadMap.get(cur) || new Set<string>();
    for (const p of pset) {
      if (!reachable.has(p)) {
        reachable.add(p);
        q.push(p);
      }
    }
    // backward: predecessors
    const preds = revAdj.get(cur) || new Set<string>();
    for (const pr of preds) {
      if (!reachable.has(pr)) {
        reachable.add(pr);
        q.push(pr);
      }
    }
  }

  // Emit direct effect edges (in -> out) where both endpoints are in reachable set
  for (const [inA, outs] of actionAdj) {
    for (const outA of outs) {
      if (reachable.has(inA) && reachable.has(outA)) {
        lines.push(`  ${sanitizeId(inA)} -> ${sanitizeId(outA)};`);
      }
    }
  }

  // Emit payload edges (arrowhead=dot) for direct payloads when both endpoints are reachable
  for (const [from, set] of payloadMap.entries()) {
    const emitted = new Set<string>();
    for (const p of Array.from(set)) {
      if (reachable.has(from) && reachable.has(p)) {
        const key = `${from}->${p}`;
        if (emitted.has(key)) continue;
        emitted.add(key);
        lines.push(`  ${sanitizeId(from)} -> ${sanitizeId(p)} [arrowhead=dot];`);
      }
    }
  }

  // Legacy handling for '__PAYLOAD__' outputs has been removed. The assembler now
  // produces `struct.loadedActions` which are emitted below as payload edges.

  // Add reducers: action -> reducer
  for (const [reducer, actions] of Object.entries(struct.fromReducers)) {
    const redId = sanitizeId(reducer);
    lines.push(`  ${redId} [label="${escapeLabel(reducer)}", shape=parallelogram];`);
    for (const a of actions) {
      const actId = sanitizeId(a);
      lines.push(`  ${actId} -> ${redId};`);
    }
  }

  // Add action nodes
  for (const a of struct.allActions) {
    const actId = sanitizeId(a.name);
    const isSelected = highlightAction === a.name;
    if (isSelected) {
      lines.push(`  ${actId} [label="${escapeLabel(a.name)}", shape=oval, style=filled, fillcolor="${highlightColor}"];`);
    } else {
      lines.push(`  ${actId} [label="${escapeLabel(a.name)}", shape=oval];`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

export default generateDotForAction;
