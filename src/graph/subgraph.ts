import { GraphEdge, GraphNode, GraphStructure, NodeKind } from '../model/types';

export function extractSubgraph(struct: GraphStructure, actionName: string): GraphStructure {
  // find the action node by name or by display meta
  const start = struct.nodes.find((n) => {
    if (n.kind !== NodeKind.Action) return false;
    if (n.name === actionName) return true;
    if (n.meta && typeof n.meta.display === 'string' && n.meta.display === actionName) return true;
    return false;
  });
  if (!start) throw new Error(`Action '${actionName}' not found`);

  const visited = new Set<string>();
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const adj = new Map<string, GraphEdge[]>();
  for (const e of struct.edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push(e);
  }

  const stack = [start.id];
  while (stack.length) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = struct.nodes.find((n) => n.id === id);
    if (node) nodes.push(node);
    const outgoing = adj.get(id) || [];
    for (const e of outgoing) {
      edges.push(e);
      if (!visited.has(e.to)) stack.push(e.to);
    }
  }

  // mark selected action node
  const nodesOut = nodes.map((n) => (n.id === start.id ? { ...n, kind: NodeKind.SelectedAction } : n));

  return { nodes: nodesOut, edges, generatedAt: new Date().toISOString(), version: struct.version };
}
