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

  // symbol maps per file: local identifier -> original name (for aliases)
  const symbolMapPerFile = new Map<string, Map<string, string>>();

  // helper to resolve a symbol to its canonical name across files (very simple resolution)
  function resolveSymbol(name: string, file: string) {
    // check local map
    const local = symbolMapPerFile.get(file);
    if (local && local.has(name)) return local.get(name)!;
    return name;
  }

  for (const fp of filePaths) {
    const content = fs.readFileSync(fp, 'utf8');
    const sf = ts.createSourceFile(fp, content, ts.ScriptTarget.Latest, true);

    // collect import/export aliases first
    const localSymbolMap = new Map<string, string>();
    symbolMapPerFile.set(fp, localSymbolMap);

    function scanImportsExports(node: ts.Node) {
      // import { createAction as ca } from 'x'
      if (ts.isImportDeclaration(node) && node.importClause && node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        for (const el of node.importClause.namedBindings.elements) {
          const propName = el.propertyName ? el.propertyName.text : el.name.text;
          const localName = el.name.text;
          localSymbolMap.set(localName, propName);
        }
      }

      // export { action1 } from './actions'
      if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        for (const el of node.exportClause.elements) {
          const name = el.name.text;
          const propName = el.propertyName ? el.propertyName.text : name;
          // mark local symbol as referring to propName
          localSymbolMap.set(name, propName);
        }
      }

      ts.forEachChild(node, scanImportsExports);
    }

    ts.forEachChild(sf, scanImportsExports);

    function visit(node: ts.Node) {
      // createAction call
  // resolve identifier names against symbol map
  const exprName = ts.isCallExpression(node) && ts.isIdentifier(node.expression) ? resolveSymbol(node.expression.text, fp) : undefined;

  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && exprName === 'createAction') {
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
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && resolveSymbol(node.expression.text, fp) === 'createEffect') {
        const parentMember = node.parent;
        let effectName = 'effect';
        if (ts.isPropertyDeclaration(parentMember) && parentMember.name) {
          if (ts.isIdentifier(parentMember.name)) effectName = parentMember.name.text;
        }
        const id = makeId(NodeKind.Effect, `${path.basename(fp)}:${effectName}`);
        nodes.push({ id, kind: NodeKind.Effect, name: effectName, file: fp, line: getLine(node, sf) });

        // find ofType inside the subtree and detect emitted actions
        function findOfType(n: ts.Node) {
          if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && resolveSymbol(n.expression.text, fp) === 'ofType') {
            for (const a of n.arguments) {
              if (ts.isIdentifier(a)) {
                const actionName = resolveSymbol(a.text, fp);
                const actId = makeId(NodeKind.Action, actionName);
                edges.push({ from: actId, to: id, type: 'listen' });
              }
            }
          }
          // detect emitted actions inside effect (call expressions and array literals)
          if (ts.isCallExpression(n)) {
            // direct emitted action: actionCreator()
            if (ts.isIdentifier(n.expression)) {
              const emittedName = resolveSymbol(n.expression.text, fp);
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
                const emittedName = resolveSymbol(el.expression.text, fp);
                edges.push({ from: id, to: makeId(NodeKind.Action, emittedName), type: 'emit' });
              }
            }
          }

          ts.forEachChild(n, findOfType);
        }
        ts.forEachChild(node, findOfType);
      }

      // createReducer -> on(action, ...)
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && resolveSymbol(node.expression.text, fp) === 'createReducer') {
        const reducerId = makeId(NodeKind.Reducer, `reducer@${path.basename(fp)}`);
        nodes.push({ id: reducerId, kind: NodeKind.Reducer, name: reducerId, file: fp, line: getLine(node, sf) });
        // find on(...) calls
        function findOn(n: ts.Node) {
          if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && resolveSymbol(n.expression.text, fp) === 'on') {
            const first = n.arguments[0];
            if (first) {
              if (ts.isIdentifier(first)) {
                const actionName = resolveSymbol(first.text, fp);
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
                const actionName = resolveSymbol(a.expression.text, fp);
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
