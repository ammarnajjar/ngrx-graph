import { GraphPayload } from './types';

export function makeNodes(payload: GraphPayload, focusedAction?: string) {
  const lines: string[] = [];
  for (const comp of Object.keys(payload.fromComponents || {})) {
    lines.push(`${comp} [shape="box", color=blue, fillcolor=blue, fontcolor=white, style=filled]`);
  }
  for (const a of payload.allActions) {
    if (focusedAction) {
      if (a.name === focusedAction) lines.push(`${a.name} [color=green, fillcolor="#007000", fontcolor=white, style=filled]`);
      else if (a.nested) lines.push(`${a.name} [color=black, fillcolor=lightcyan, fontcolor=black, style=filled]`);
      else lines.push(`${a.name} [fillcolor=linen, style=filled]`);
    } else {
      if (a.nested) lines.push(`${a.name} [color=black, fillcolor=lightcyan, fontcolor=black, style=filled]`);
      else lines.push(`${a.name} [fillcolor=linen, style=filled]`);
    }
  }
  for (const r of Object.keys(payload.fromReducers || {})) {
    lines.push(`${r} [shape="hexagon", color=purple, fillcolor=purple, fontcolor=white, style=filled]`);
  }
  return lines;
}
