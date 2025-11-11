import { GraphNode, NodeKind } from '../model/types';

export function escapeLabel(s: string) {
  return s.replace(/"/g, '\\"');
}

export function nodeStyle(n: GraphNode) {
  switch (n.kind) {
    case NodeKind.Action:
      return 'shape=ellipse style=filled fillcolor=lightgoldenrod1';
    case NodeKind.SelectedAction:
      return 'shape=doublecircle style=filled fillcolor=gold';
    case NodeKind.NestedAction:
      return 'shape=ellipse style=filled fillcolor=lightskyblue';
    case NodeKind.Component:
      return 'shape=box style=filled fillcolor=lightgreen';
    case NodeKind.Effect:
      return 'shape=diamond style=filled fillcolor=lightpink';
    case NodeKind.Reducer:
      return 'shape=hexagon style=filled fillcolor=lightgray';
    default:
      return '';
  }
}
