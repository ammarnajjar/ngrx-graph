import { GraphPayload } from './types';

export function makeEdges(payload: GraphPayload) {
  const lines: string[] = [];
  for (const [comp, actions] of Object.entries(payload.fromComponents || {})) {
    for (const a of actions) lines.push(`${comp} -> ${a}`);
  }
  for (const io of Object.values(payload.fromEffects || {})) {
    for (const out of io.output) for (const inp of io.input) lines.push(`${inp} -> ${out}`);
  }
  for (const [r, actions] of Object.entries(payload.fromReducers || {})) {
    for (const a of actions) lines.push(`${a} -> ${r}`);
  }
  for (const l of payload.loadedActions || []) {
    for (const p of l.payloadActions) lines.push(`${l.name} -> ${p} [arrowhead=dot]`);
  }
  return dedupeLines(lines);
}

export function dedupeLines(lines: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines)
    if (!seen.has(l)) {
      seen.add(l);
      out.push(l);
    }
  return out;
}
