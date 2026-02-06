import fs from 'fs/promises';
import ts from 'typescript';
import { createSource, getUnquotedText } from './utils';

function extractPayloadActions(objLiteral: ts.ObjectLiteralExpression): string[] {
  const payloads: string[] = [];
  for (const p of objLiteral.properties) {
    if (ts.isPropertyAssignment(p) && ts.isCallExpression(p.initializer)) {
      const pc = p.initializer.expression;
      if (ts.isIdentifier(pc)) payloads.push(pc.text);
      else if (ts.isPropertyAccessExpression(pc)) payloads.push(pc.name.text);
    }
  }
  return payloads;
}

function extractActionName(expr: ts.Expression): string | null {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return null;
}

function processOfTypeCall(n: ts.CallExpression, inputs: Set<string>): void {
  for (const a of n.arguments) {
    if (ts.isIdentifier(a)) inputs.add(a.text);
    else if (ts.isCallExpression(a) && ts.isIdentifier(a.expression)) inputs.add(a.expression.text);
  }
}

function processMapOperatorCall(
  n: ts.CallExpression,
  outputs: Set<string>,
  loaded: Array<{ name: string; payloadActions: string[] }>
): void {
  for (const a of n.arguments) {
    if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) {
      function walkInside(fnNode: ts.Node) {
        if (ts.isCallExpression(fnNode)) {
          const called = fnNode.expression;
          const actionName = extractActionName(called);
          if (actionName) outputs.add(actionName);

          if (fnNode.arguments && fnNode.arguments.length) {
            const firstArg = fnNode.arguments[0];
            if (ts.isObjectLiteralExpression(firstArg)) {
              const payloads = extractPayloadActions(firstArg);
              if (payloads.length && actionName) {
                loaded.push({ name: actionName, payloadActions: payloads });
              }
            }
          }
        }
        if (ts.isReturnStatement(fnNode) && fnNode.expression) {
          const re = fnNode.expression;
          if (ts.isCallExpression(re)) {
            const actionName = extractActionName(re.expression);
            if (actionName) outputs.add(actionName);
          } else if (ts.isIdentifier(re)) outputs.add(re.text);
        }
        ts.forEachChild(fnNode, walkInside);
      }
      walkInside(a);
    }
  }
}

function processArrayLiteral(
  n: ts.ArrayLiteralExpression,
  outputs: Set<string>,
  loaded: Array<{ name: string; payloadActions: string[] }>
): void {
  for (const el of n.elements) {
    if (ts.isCallExpression(el)) {
      const cal = el.expression;
      if (ts.isIdentifier(cal)) {
        outputs.add(cal.text);
        if (el.arguments && el.arguments.length) {
          const a0 = el.arguments[0];
          if (ts.isObjectLiteralExpression(a0)) {
            const payloads = extractPayloadActions(a0);
            if (payloads.length) loaded.push({ name: cal.text, payloadActions: payloads });
          }
        }
      }
    }
  }
}

function processDispatchCall(
  n: ts.CallExpression,
  outputs: Set<string>,
  loaded: Array<{ name: string; payloadActions: string[] }>
): void {
  const args = n.arguments;
  if (args && args.length) {
    const first = args[0];
    if (ts.isCallExpression(first)) {
      const e = first.expression;
      const actionName = extractActionName(e);
      if (actionName) outputs.add(actionName);

      if (first.arguments && first.arguments.length) {
        const a0 = first.arguments[0];
        if (ts.isObjectLiteralExpression(a0)) {
          const payloads = extractPayloadActions(a0);
          if (payloads.length && actionName) {
            loaded.push({ name: actionName, payloadActions: payloads });
          }
        }
      }
    } else if (ts.isIdentifier(first)) outputs.add(first.text);
    else if (ts.isObjectLiteralExpression(first)) {
      for (const prop of first.properties) {
        if (
          ts.isPropertyAssignment(prop) &&
          prop.name &&
          getUnquotedText(prop.name) === 'type'
        ) {
          const init = prop.initializer;
          if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) outputs.add(init.text);
        }
      }
    } else if (ts.isPropertyAccessExpression(first)) outputs.add(first.name.text);
  }
}

function processNestedCallExpression(
  n: ts.CallExpression,
  outputs: Set<string>,
  loaded: Array<{ name: string; payloadActions: string[] }>
): void {
  for (const arg of n.arguments) {
    if (ts.isCallExpression(arg)) {
      const cal = arg.expression;
      if (ts.isIdentifier(cal) || ts.isPropertyAccessExpression(cal)) {
        const name = ts.isIdentifier(cal) ? cal.text : cal.name.text;
        outputs.add(name);
        const firstInner = arg.arguments && arg.arguments.length ? arg.arguments[0] : undefined;
        if (firstInner && ts.isObjectLiteralExpression(firstInner)) {
          const payloads = extractPayloadActions(firstInner);
          if (payloads.length) loaded.push({ name, payloadActions: payloads });
        }
      }
    }
  }
}

export async function parseEffectsFromText(text: string, file = 'file.ts') {
  const sf = createSource(text, file);
  const res: Record<string, { input: string[]; output: string[] }> = {};
  const loaded: Array<{ name: string; payloadActions: string[] }> = [];

  function visit(node: ts.Node): void {
    if (ts.isPropertyDeclaration(node) || ts.isPropertyAssignment(node)) {
      const propName = node.name ? getUnquotedText(node.name) : undefined;
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
          if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'ofType') {
            processOfTypeCall(n, inputs);
          }

          if (
            ts.isCallExpression(n) &&
            ts.isIdentifier(n.expression) &&
            /^(map|mergeMap|switchMap|concatMap|exhaustMap)$/.test(n.expression.text)
          ) {
            processMapOperatorCall(n, outputs, loaded);
          }

          if (ts.isArrayLiteralExpression(n)) {
            processArrayLiteral(n, outputs, loaded);
          }

          if (
            ts.isCallExpression(n) &&
            ts.isPropertyAccessExpression(n.expression) &&
            n.expression.name.text === 'dispatch'
          ) {
            processDispatchCall(n, outputs, loaded);
          }

          if (ts.isCallExpression(n)) {
            processNestedCallExpression(n, outputs, loaded);
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
