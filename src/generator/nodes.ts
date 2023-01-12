import { Identifier, Node, SyntaxKind } from 'typescript';

export function getChildNodesRecursivly(node: Node): Node[] {
  if (node.kind === SyntaxKind.Identifier) {
    return [node];
  }

  const childNodes = node
    .getChildren()
    .reduce(
      (all: Node[], child: Node) => [...all, ...getChildNodesRecursivly(child)],
      [],
    );
  return [node, ...childNodes];
}

export function getParentNodes(node: Node, identifiers: string[]): Node[] {
  if (
    node.kind === SyntaxKind.Identifier &&
    identifiers.includes((node as Identifier).escapedText.toString()) &&
    node.parent.kind !== SyntaxKind.ImportSpecifier
  ) {
    return [node.parent];
  }

  let nodes: Node[] = [];
  node.forEachChild(child => {
    const idenNode = getParentNodes(child, identifiers);
    if (idenNode.length > 0) {
      nodes = [...nodes, ...idenNode];
    }
  });
  return nodes;
}
