import fs from 'fs/promises';
import path from 'path';
import { dedupeLines, makeEdges } from './edges';
import { generateDotForActionPayload } from './generator';
import { makeNodes } from './nodes';
import { GraphPayload } from './types';

export async function generateDotFilesFromPayload(payload: GraphPayload, out: string) {
  await fs.mkdir(out, { recursive: true });
  const nodes = makeNodes(payload);
  const edges = makeEdges(payload);
  const allLines = ['digraph {', ...nodes, ...edges, '}'];
  await fs.writeFile(path.join(out, 'all.dot'), dedupeLines(allLines).join('\n'), 'utf8');

  for (const a of payload.allActions) {
    // Use the focused generator to produce per-action DOT (only reachable nodes)
    await generateDotForActionPayload(payload, a.name, out);
  }
  return out;
}

export async function generateAllFromJson(jsonPath: string, outDir?: string) {
  const txt = await fs.readFile(jsonPath, 'utf8');
  const payload = JSON.parse(txt) as GraphPayload;
  const out = outDir ? path.resolve(outDir) : path.dirname(path.resolve(jsonPath));
  await fs.mkdir(out, { recursive: true });
  const nodes = makeNodes(payload);
  const edges = makeEdges(payload);
  const allLines = ['digraph {', ...nodes, ...edges, '}'];
  await fs.writeFile(path.join(out, 'all.dot'), dedupeLines(allLines).join('\n'), 'utf8');
  return path.join(out, 'all.dot');
}

export async function generateAllFromPayload(payload: GraphPayload, outDir: string) {
  const out = outDir ? path.resolve(outDir) : '.';
  await fs.mkdir(out, { recursive: true });
  const nodes = makeNodes(payload);
  const edges = makeEdges(payload);
  const allLines = ['digraph {', ...nodes, ...edges, '}'];
  await fs.writeFile(path.join(out, 'all.dot'), dedupeLines(allLines).join('\n'), 'utf8');
  return path.join(out, 'all.dot');
}

export async function generateDotFilesFromJson(jsonPath: string, outDir?: string) {
  const txt = await fs.readFile(jsonPath, 'utf8');
  const payload = JSON.parse(txt) as GraphPayload;
  const out = outDir ? path.resolve(outDir) : path.dirname(path.resolve(jsonPath));
  return generateDotFilesFromPayload(payload, out);
}

export default { generateDotFilesFromJson };
