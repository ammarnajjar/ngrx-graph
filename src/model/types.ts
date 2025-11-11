/**
 * MIT Licensed. Public types for ngrx-graph
 */

/** Kinds of nodes in the generated graph */
export enum NodeKind {
  Action = 'Action',
  SelectedAction = 'SelectedAction',
  NestedAction = 'NestedAction',
  Component = 'Component',
  Effect = 'Effect',
  Reducer = 'Reducer',
}

/** A node in the graph representing an entity */
export interface GraphNode {
  id: string; // unique id
  kind: NodeKind;
  name: string;
  file: string;
  line: number;
  meta?: Record<string, unknown>;
}

/** Edge types between nodes */
export type EdgeType = 'dispatch' | 'listen' | 'emit' | 'handle' | 'nest';

/** A directed edge */
export interface GraphEdge {
  from: string; // node id
  to: string; // node id
  type: EdgeType;
}

/** Whole graph structure (serializable) */
export interface GraphStructure {
  nodes: GraphNode[];
  edges: GraphEdge[];
  generatedAt: string;
  version: string;
}
