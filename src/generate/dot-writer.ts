import fs from 'fs';
import path from 'path';
import { GraphStructure } from '../model/types';
import { escapeLabel, nodeStyle } from './graphviz-helpers';

export function writeDot(struct: GraphStructure, outputPath: string) {
  const parts: string[] = [];
  parts.push('digraph G {');
  parts.push('  rankdir=LR;');

  for (const n of struct.nodes) {
    const id = JSON.stringify(n.id);
    const label = escapeLabel(n.name);
    const style = nodeStyle(n);
    parts.push(`  ${id} [label="${label}" ${style}];`);
  }

  for (const e of struct.edges) {
    const from = JSON.stringify(e.from);
    const to = JSON.stringify(e.to);
    const label = e.type;
    parts.push(`  ${from} -> ${to} [label="${label}"];`);
  }

  parts.push('}');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, parts.join('\n'), 'utf8');
  return outputPath;
}
