import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { GraphEdge, GraphNode, NodeKind } from '../model/types';

interface ParseResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function makeId(kind: NodeKind, name: string) {
  return `${kind}:${name}`;
}

function getLine(node: ts.Node, sourceFile: ts.SourceFile) {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  return line + 1;
}

export function parseFiles(filePaths: string[]): ParseResult {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const actionNames = new Map<string, { file: string; line: number }>();

  for (const fp of filePaths) {
    const content = fs.readFileSync(fp, 'utf8');
    const sf = ts.createSourceFile(fp, content, ts.ScriptTarget.Latest, true);

    function visit(node: ts.Node) {
      // createAction call
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'createAction') {
        const arg = node.arguments[0];
        let displayName: string | undefined = undefined;
        if (arg && ts.isStringLiteral(arg)) {
          displayName = arg.text;
        }

        // try to find variable name: createAction assigned to const action1 = createAction(...)
        let varName: string | undefined;
        let parent = node.parent;
        while (parent) {
          if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
            varName = parent.name.text;
            break;
          }
          parent = parent.parent;
        }

        const name = varName || displayName || 'unknown_action';
        const id = makeId(NodeKind.Action, name);
        actionNames.set(name, { file: fp, line: getLine(node, sf) });
        const meta: Record<string, unknown> = {};
        if (displayName) meta.display = displayName;
        nodes.push({ id, kind: NodeKind.Action, name, file: fp, line: getLine(node, sf), meta });
      }

      // createEffect detection: look for createEffect(() => this.actions$.pipe(ofType(...), ...))
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'createEffect') {
        const parentMember = node.parent;
        let effectName = 'effect';
        if (ts.isPropertyDeclaration(parentMember) && parentMember.name) {
          if (ts.isIdentifier(parentMember.name)) effectName = parentMember.name.text;
        }
        const id = makeId(NodeKind.Effect, `${path.basename(fp)}:${effectName}`);
        nodes.push({ id, kind: NodeKind.Effect, name: effectName, file: fp, line: getLine(node, sf) });

        // find ofType inside the subtree and detect emitted actions
        function findOfType(n: ts.Node) {
          if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'ofType') {
            for (const a of n.arguments) {
              if (ts.isIdentifier(a)) {
                const actionName = a.text;
                const actId = makeId(NodeKind.Action, actionName);
                edges.push({ from: actId, to: id, type: 'listen' });
              }
            }
          }
          // detect emitted actions inside effect (call expressions and array literals)
          if (ts.isCallExpression(n)) {
            // direct emitted action: actionCreator()
            if (ts.isIdentifier(n.expression)) {
              const emittedName = n.expression.text;
              const emittedId = makeId(NodeKind.Action, emittedName);
              edges.push({ from: id, to: emittedId, type: 'emit' });

              // if the emitted call is nestedAction({ action: actionX() }) -> create nest edge
              if (n.arguments && n.arguments.length > 0) {
                const first = n.arguments[0];
                if (ts.isObjectLiteralExpression(first)) {
                  for (const prop of first.properties) {
                    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === 'action') {
                      const init = prop.initializer;
                      if (ts.isCallExpression(init) && ts.isIdentifier(init.expression)) {
                        const inner = init.expression.text;
                        const innerId = makeId(NodeKind.Action, inner);
                        const outerId = makeId(NodeKind.Action, emittedName);
                        edges.push({ from: outerId, to: innerId, type: 'nest' });
                      }
                    }
                  }
                }
              }
            }
          }

          if (ts.isArrayLiteralExpression(n)) {
            for (const el of n.elements) {
              if (ts.isCallExpression(el) && ts.isIdentifier(el.expression)) {
                const emittedName = el.expression.text;
                edges.push({ from: id, to: makeId(NodeKind.Action, emittedName), type: 'emit' });
              }
            }
          }

          ts.forEachChild(n, findOfType);
        }
        ts.forEachChild(node, findOfType);
      }

      // createReducer -> on(action, ...)
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'createReducer') {
        const reducerId = makeId(NodeKind.Reducer, `reducer@${path.basename(fp)}`);
        nodes.push({ id: reducerId, kind: NodeKind.Reducer, name: reducerId, file: fp, line: getLine(node, sf) });
        // find on(...) calls
        function findOn(n: ts.Node) {
          if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'on') {
            const first = n.arguments[0];
            if (first) {
              if (ts.isIdentifier(first)) {
                const actionName = first.text;
                const actId = makeId(NodeKind.Action, actionName);
                edges.push({ from: actId, to: reducerId, type: 'handle' });
              }
            }
          }
          ts.forEachChild(n, findOn);
        }
        ts.forEachChild(node, findOn);
      }

      // dispatch: this.store.dispatch(action())
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const prop = node.expression;
        if (prop.name.text === 'dispatch') {
          // attempt to find action creator call inside args
          for (const a of node.arguments) {
            if (ts.isCallExpression(a)) {
              if (ts.isIdentifier(a.expression)) {
                const actionName = a.expression.text;
                const compId = makeId(NodeKind.Component, path.basename(fp));
                if (!nodes.find((n) => n.id === compId)) {
                  nodes.push({ id: compId, kind: NodeKind.Component, name: path.basename(fp), file: fp, line: getLine(node, sf) });
                }
                const actId = makeId(NodeKind.Action, actionName);
                edges.push({ from: compId, to: actId, type: 'dispatch' });

                // detect nested payload: nestedAction({ action: someAction() })
                if (a.arguments && a.arguments.length > 0) {
                  const first = a.arguments[0];
                  if (ts.isObjectLiteralExpression(first)) {
                    for (const propAssign of first.properties) {
                      if (ts.isPropertyAssignment(propAssign) && ts.isIdentifier(propAssign.name) && propAssign.name.text === 'action') {
                        const init = propAssign.initializer;
                        if (ts.isCallExpression(init) && ts.isIdentifier(init.expression)) {
                          const inner = init.expression.text;
                          edges.push({ from: makeId(NodeKind.Action, actionName), to: makeId(NodeKind.Action, inner), type: 'nest' });
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    ts.forEachChild(sf, visit);
  }

  // ensure unique nodes
  const uniqNodes = new Map(nodes.map((n) => [n.id, n]));
  return { nodes: Array.from(uniqNodes.values()), edges };
}
