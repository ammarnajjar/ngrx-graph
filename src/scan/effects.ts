import fs from 'fs/promises';
import ts from 'typescript';
import { createSource } from './utils';

export async function parseEffectsFromText(text: string, file = 'file.ts') {
  const sf = createSource(text, file);
  const res: Record<string, { input: string[]; output: string[] }> = {};
  const loaded: Array<{ name: string; payloadActions: string[] }> = [];

  function visit(node: ts.Node): void {
    if (ts.isPropertyDeclaration(node) || ts.isPropertyAssignment(node)) {
      const propName = node.name ? node.name.getText().replace(/['"]/g, '') : undefined;
      if (!propName) return ts.forEachChild(node, visit);

      const initializer = (node as ts.PropertyDeclaration | ts.PropertyAssignment).initializer;
      if (
        initializer &&
        ts.isCallExpression(initializer) &&
        ts.isIdentifier(initializer.expression) &&
        initializer.expression.text === 'createEffect'
      ) {
        const arg = initializer.arguments[0];
        const inputs = new Set<string>();
        const outputs = new Set<string>();

        function walkEffectBody(n: ts.Node) {
          // ofType(...) inputs
          if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'ofType') {
            for (const a of n.arguments) {
              if (ts.isIdentifier(a)) inputs.add(a.text);
              else if (ts.isCallExpression(a) && ts.isIdentifier(a.expression)) inputs.add(a.expression.text);
            }
          }

          // map/mergeMap/... handlers: inspect returned calls inside the function body
          if (
            ts.isCallExpression(n) &&
            ts.isIdentifier(n.expression) &&
            /^(map|mergeMap|switchMap|concatMap|exhaustMap)$/.test(n.expression.text)
          ) {
            for (const a of n.arguments) {
                if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) {
                  // recursively walk the function body to find nested call expressions
                  function walkInside(fnNode: ts.Node) {
                    if (ts.isCallExpression(fnNode)) {
                      const called = fnNode.expression;
                      if (ts.isIdentifier(called)) outputs.add(called.text);
                      else if (ts.isPropertyAccessExpression(called)) outputs.add(called.name.text);
                      // extract payload actions if the call has an object literal as first arg
                      if (fnNode.arguments && fnNode.arguments.length) {
                        const firstArg = fnNode.arguments[0];
                        if (ts.isObjectLiteralExpression(firstArg)) {
                          const payloads: string[] = [];
                          for (const p of firstArg.properties) {
                            if (ts.isPropertyAssignment(p) && ts.isCallExpression(p.initializer)) {
                              const pc = p.initializer.expression;
                              if (ts.isIdentifier(pc)) payloads.push(pc.text);
                              else if (ts.isPropertyAccessExpression(pc)) payloads.push(pc.name.text);
                            }
                          }
                          if (payloads.length) {
                            let calledName = 'unknown';
                            if (ts.isIdentifier(called)) calledName = called.text;
                            else if (ts.isPropertyAccessExpression(called)) calledName = called.name.text;
                            loaded.push({ name: calledName, payloadActions: payloads });
                          }
                        }
                      }
                    }
                    if (ts.isReturnStatement(fnNode) && fnNode.expression) {
                      const re = fnNode.expression;
                      if (ts.isCallExpression(re)) {
                        const called = re.expression;
                        if (ts.isIdentifier(called)) outputs.add(called.text);
                        else if (ts.isPropertyAccessExpression(called)) outputs.add(called.name.text);
                      } else if (ts.isIdentifier(re)) outputs.add(re.text);
                    }
                    ts.forEachChild(fnNode, walkInside);
                  }
                  walkInside(a);
                }
              }
          }

          // Array literal of actions
          if (ts.isArrayLiteralExpression(n)) {
            for (const el of n.elements) {
              if (ts.isCallExpression(el)) {
                const cal = el.expression;
                if (ts.isIdentifier(cal)) {
                  outputs.add(cal.text);
                  if (el.arguments && el.arguments.length) {
                    const a0 = el.arguments[0];
                    if (ts.isObjectLiteralExpression(a0)) {
                      const payloads: string[] = [];
                      for (const p of a0.properties) {
                        if (ts.isPropertyAssignment(p) && ts.isCallExpression(p.initializer)) {
                          const pc = p.initializer.expression;
                          if (ts.isIdentifier(pc)) payloads.push(pc.text);
                          else if (ts.isPropertyAccessExpression(pc)) payloads.push(pc.name.text);
                        }
                      }
                      if (payloads.length) loaded.push({ name: cal.text, payloadActions: payloads });
                    }
                  }
                }
              }
            }
          }

          // store.dispatch(action(...)) and similar patterns
          if (
            ts.isCallExpression(n) &&
            ts.isPropertyAccessExpression(n.expression) &&
            n.expression.name.text === 'dispatch'
          ) {
            const args = n.arguments;
            if (args && args.length) {
              const first = args[0];
              if (ts.isCallExpression(first)) {
                const e = first.expression;
                if (ts.isIdentifier(e)) outputs.add(e.text);
                else if (ts.isPropertyAccessExpression(e)) outputs.add(e.name.text);
                if (first.arguments && first.arguments.length) {
                  const a0 = first.arguments[0];
                  if (ts.isObjectLiteralExpression(a0)) {
                    const payloads: string[] = [];
                    for (const p of a0.properties) {
                      if (ts.isPropertyAssignment(p) && ts.isCallExpression(p.initializer)) {
                        const cal = p.initializer.expression;
                        if (ts.isIdentifier(cal)) payloads.push(cal.text);
                        else if (ts.isPropertyAccessExpression(cal)) payloads.push(cal.name.text);
                      }
                    }
                    if (payloads.length)
                      loaded.push({
                        name: ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : 'unknown',
                        payloadActions: payloads,
                      });
                  }
                }
              } else if (ts.isIdentifier(first)) outputs.add(first.text);
              else if (ts.isObjectLiteralExpression(first)) {
                for (const prop of first.properties) {
                  if (
                    ts.isPropertyAssignment(prop) &&
                    prop.name &&
                    prop.name.getText().replace(/['"]/g, '') === 'type'
                  ) {
                    const init = prop.initializer;
                    if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) outputs.add(init.text);
                  }
                }
              } else if (ts.isPropertyAccessExpression(first)) outputs.add(first.name.text);
            }
          }

          // General case: catch action creator calls passed as arguments to other calls
          // e.g. orderItemHandle(..., vouchersAdded({ amount: ... }))
          if (ts.isCallExpression(n)) {
            for (const arg of n.arguments) {
              if (ts.isCallExpression(arg)) {
                const cal = arg.expression;
                if (ts.isIdentifier(cal) || ts.isPropertyAccessExpression(cal)) {
                  const name = ts.isIdentifier(cal) ? cal.text : cal.name.text;
                  outputs.add(name);
                  const firstInner = arg.arguments && arg.arguments.length ? arg.arguments[0] : undefined;
                  if (firstInner && ts.isObjectLiteralExpression(firstInner)) {
                    const payloads: string[] = [];
                    for (const p of firstInner.properties) {
                      if (ts.isPropertyAssignment(p) && ts.isCallExpression(p.initializer)) {
                        const pc = p.initializer.expression;
                        if (ts.isIdentifier(pc)) payloads.push(pc.text);
                        else if (ts.isPropertyAccessExpression(pc)) payloads.push(pc.name.text);
                      }
                    }
                    if (payloads.length) loaded.push({ name, payloadActions: payloads });
                  }
                }
              }
            }
          }

          ts.forEachChild(n, walkEffectBody);
        }

        walkEffectBody(arg || initializer);

        res[propName] = res[propName] ?? { input: [], output: [] };
        res[propName].input.push(...Array.from(inputs));
        res[propName].output.push(...Array.from(outputs));
        return;
      }

    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return { mapping: res, loaded };
}

export async function parseEffectsFromFile(file: string) {
  const text = await fs.readFile(file, 'utf8');
  return parseEffectsFromText(text, file);
}

