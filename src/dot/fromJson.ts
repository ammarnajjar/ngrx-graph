import { Structure } from '../assembler';

function sanitizeId(s: string) {
  return String(s).replace(/"/g, '').replace(/\s+/g, '_');
}

function qstr(s: string) {
  return String(s);
}

export type JsonDotOptions = { highlightAction?: string; highlightColor?: string };

export function generateDotFromJson(struct: Structure, actionName: string, opts: JsonDotOptions = {}): string {
  const { highlightAction, highlightColor = '#007000' } = opts;
  const root = actionName;
  const shouldHighlightRoot = highlightAction === root;
  const lines: string[] = [];
  // Build adjacency from effects (in -> outs)
  const actionAdj = new Map<string, Set<string>>();
  for (const a of struct.allActions || []) actionAdj.set(a.name, new Set<string>());
  for (const [, info] of Object.entries(struct.fromEffects || {})) {
    for (const inA of info.input) {
      if (!actionAdj.has(inA)) actionAdj.set(inA, new Set<string>());
      const set = actionAdj.get(inA)!;
      for (const outA of info.output) {
        set.add(outA);
      }
    }
  }

  // payload relations from loadedActions
  const payloadMap = new Map<string, Set<string>>();
  for (const l of struct.loadedActions || []) {
    const name = String(l.name);
    const payloads: string[] = l.payloadActions || [];
    if (!payloadMap.has(name)) payloadMap.set(name, new Set());
    for (const p of payloads) payloadMap.get(name)!.add(String(p));
  }

  // build reverse adjacency for backward traversal
  const revAdj = new Map<string, Set<string>>();
  for (const [from, outs] of actionAdj) {
    for (const out of outs) {
      if (!revAdj.has(out)) revAdj.set(out, new Set());
      revAdj.get(out)!.add(from);
    }
  }
  for (const [from, set] of payloadMap.entries()) {
    for (const p of set) {
      if (!revAdj.has(p)) revAdj.set(p, new Set());
      revAdj.get(p)!.add(from);
    }
  }

  // compute reachable set (forward via actionAdj and payloadMap, backward via revAdj)
  const selected = root;
  const reachable = new Set<string>();
  const queue: string[] = [];
  if (selected) {
    reachable.add(selected);
    queue.push(selected);
  }
  while (queue.length) {
    const cur = queue.shift()!;
    // forward: effects
    const outs = actionAdj.get(cur) || new Set<string>();
    for (const o of outs) {
      if (!reachable.has(o)) {
        reachable.add(o);
        queue.push(o);
      }
    }
    // forward: payloads
    const pset = payloadMap.get(cur) || new Set<string>();
    for (const p of pset) {
      if (!reachable.has(p)) {
        reachable.add(p);
        queue.push(p);
      }
    }
    // backward: predecessors
    const preds = revAdj.get(cur) || new Set<string>();
    for (const pr of preds) {
      if (!reachable.has(pr)) {
        reachable.add(pr);
        queue.push(pr);
      }
    }
  }

  lines.push('digraph {');

  // components
  for (const comp of Object.keys(struct.fromComponents || {})) {
    const actions = struct.fromComponents?.[comp] || [];
    // include component only if it dispatches a reachable action
    const includeComp = actions.some(a => reachable.has(a));
    if (includeComp) {
      lines.push(`${qstr(sanitizeId(comp))} [shape="box", color=blue, fillcolor=blue, fontcolor=white, style=filled]`);
    }
  }

  const nestedNames = new Set((struct.allActions || []).filter(a => a && a.nested).map(a => a.name));

  // action nodes: only include reachable actions
  for (const a of struct.allActions || []) {
    const name = a.name;
    if (!reachable.has(name)) continue;
    if (name === root && shouldHighlightRoot) {
      lines.push(`${qstr(sanitizeId(name))} [color=green, fillcolor="${highlightColor}", fontcolor=white, style=filled]`);
    } else if (nestedNames.has(name)) {
      lines.push(`${qstr(sanitizeId(name))} [color=black, fillcolor=lightcyan, fontcolor=black, style=filled]`);
    } else {
      lines.push(`${qstr(sanitizeId(name))} [fillcolor=linen, style=filled]`);
    }
  }

  // reducers: only include reducers that handle at least one reachable action
  for (const [r, actions] of Object.entries(struct.fromReducers || {})) {
    const handlesReachable = (actions as string[]).some(a => reachable.has(a));
    if (handlesReachable) {
      lines.push(`${qstr(sanitizeId(r))} [shape="hexagon", color=purple, fillcolor=purple, fontcolor=white, style=filled]`);
    }
  }

  // component -> action (only for reachable actions)
  for (const [comp, actions] of Object.entries(struct.fromComponents || {})) {
    for (const a of actions) {
      if (!reachable.has(a)) continue;
      lines.push(`${qstr(sanitizeId(comp))} -> ${qstr(sanitizeId(a))}`);
    }
  }

  // effects: input -> output (only include when both endpoints are reachable)
  for (const [, info] of Object.entries(struct.fromEffects || {})) {
    for (const inA of info.input) {
      for (const outA of info.output) {
        if (!reachable.has(inA) || !reachable.has(outA)) continue;
        lines.push(`${qstr(sanitizeId(inA))} -> ${qstr(sanitizeId(outA))}`);
      }
    }
  }

  // action -> reducer (only include reducers that handle reachable actions)
  for (const [r, actions] of Object.entries(struct.fromReducers || {})) {
    for (const a of actions) {
      if (!reachable.has(a)) continue;
      lines.push(`${qstr(sanitizeId(a))} -> ${qstr(sanitizeId(r))}`);
    }
  }

  // loaded actions (dotted)
  for (const l of struct.loadedActions || []) {
    const payloads = l.payloadActions || [];
    if (!reachable.has(l.name)) continue;
    for (const p of payloads) {
      if (!reachable.has(p)) continue;
      lines.push(`${qstr(sanitizeId(l.name))} -> ${qstr(sanitizeId(p))} [arrowhead=dot]`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

export default generateDotFromJson;
