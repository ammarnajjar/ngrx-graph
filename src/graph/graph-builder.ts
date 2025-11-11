import { GraphEdge, GraphNode } from '../model/types';

export function buildGraph(nodes: GraphNode[], edges: GraphEdge[]) {
  // ensure nodes map and edges normalized
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const normalizedEdges = edges.filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to));
  return { nodes: Array.from(nodeMap.values()), edges: normalizedEdges };
}
