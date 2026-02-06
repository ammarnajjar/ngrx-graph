import fs from 'fs/promises';
import path from 'path';
import ts from 'typescript';
import { createSource, getUnquotedText } from './utils';

export async function parseComponentsFromText(text: string, file = 'file.ts') {
  const sf = createSource(text, file);
  const res: Record<string, string[]> = {};
  const loaded: Array<{ name: string; payloadActions: string[] }> = [];

  function enclosingClassName(node: ts.Node): string | undefined {
    let cur: ts.Node | undefined = node;
    while (cur) {
      if (ts.isClassDeclaration(cur) && cur.name) return cur.name.text;
      cur = cur.parent;
    }
    return undefined;
  }

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isPropertyAccessExpression(expr) && expr.name && expr.name.text === 'dispatch') {
        const args = node.arguments;
        if (args && args.length) {
          const first = args[0];
          let actionName: string | undefined;
          if (ts.isCallExpression(first)) {
            const e = first.expression;
            if (ts.isIdentifier(e)) actionName = e.text;
            else if (ts.isPropertyAccessExpression(e)) actionName = e.name.text;
          } else if (ts.isIdentifier(first)) {
            actionName = first.text;
          } else if (ts.isObjectLiteralExpression(first)) {
            for (const prop of first.properties) {
              if (ts.isPropertyAssignment(prop) && prop.name && getUnquotedText(prop.name) === 'type') {
                const init = prop.initializer;
                if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) actionName = init.text;
              }
            }
          } else if (ts.isPropertyAccessExpression(first)) actionName = first.name.text;

          if (actionName) {
            const className = enclosingClassName(node) ?? path.basename(file, '.ts');
            res[className] = res[className] ?? [];
            if (!res[className].includes(actionName)) res[className].push(actionName);

            if (ts.isCallExpression(first) && first.arguments && first.arguments.length) {
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
                if (payloads.length) loaded.push({ name: actionName, payloadActions: payloads });
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return { mapping: res, loaded };
}

export async function parseComponentsFromFile(file: string) {
  const text = await fs.readFile(file, 'utf8');
  return parseComponentsFromText(text, file);
}
