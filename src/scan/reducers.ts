import fs from 'fs/promises';
import path from 'path';
import ts from 'typescript';
import { createSource } from './utils';

export async function parseReducersFromText(text: string, file = 'file.ts') {
  const sf = createSource(text, file);
  const res: Record<string, string[]> = {};

  const reducerNames: string[] = [];
  ts.forEachChild(sf, node => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (decl.name && ts.isIdentifier(decl.name) && decl.initializer && ts.isCallExpression(decl.initializer) && ts.isIdentifier(decl.initializer.expression) && decl.initializer.expression.text === 'createReducer') {
          const name = decl.name.text;
          const key = name;
          reducerNames.push(name);
          const actions = new Set<string>();
          for (const arg of decl.initializer.arguments) {
            if (ts.isCallExpression(arg) && ts.isIdentifier(arg.expression) && arg.expression.text === 'on') {
              for (const a of arg.arguments) {
                if (ts.isArrayLiteralExpression(a)) {
                  for (const el of a.elements) {
                    if (ts.isIdentifier(el)) actions.add(el.text);
                    else if (ts.isCallExpression(el) && ts.isIdentifier(el.expression)) actions.add(el.expression.text);
                    else if (ts.isPropertyAccessExpression(el)) actions.add(el.name.text);
                  }
                  continue;
                }
                if (ts.isIdentifier(a)) actions.add(a.text);
                else if (ts.isCallExpression(a) && ts.isIdentifier(a.expression)) actions.add(a.expression.text);
                else if (ts.isPropertyAccessExpression(a)) actions.add(a.name.text);
                else if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) break;
              }
            }
          }
          res[key] = Array.from(actions);
        }
      }
    }
  });

  if (!reducerNames.length) {
    const actions = new Set<string>();
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'on') {
        for (const a of node.arguments) {
          if (ts.isArrayLiteralExpression(a)) {
            for (const el of a.elements) {
              if (ts.isIdentifier(el)) actions.add(el.text);
              else if (ts.isCallExpression(el) && ts.isIdentifier(el.expression)) actions.add(el.expression.text);
              else if (ts.isPropertyAccessExpression(el)) actions.add(el.name.text);
            }
            continue;
          }
          if (ts.isIdentifier(a)) actions.add(a.text);
          else if (ts.isCallExpression(a) && ts.isIdentifier(a.expression)) actions.add(a.expression.text);
          else if (ts.isPropertyAccessExpression(a)) actions.add(a.name.text);
          else if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) break;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
    if (actions.size) {
      let chosenKey = path.basename(file, '.ts');
      ts.forEachChild(sf, node => {
        if (ts.isVariableStatement(node)) {
          const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
          for (const decl of node.declarationList.declarations) {
            if (isExported && decl.name && ts.isIdentifier(decl.name)) {
              chosenKey = decl.name.text;
              return;
            }
          }
        }
      });
      res[chosenKey] = Array.from(actions);
    }
  }

  return { mapping: res };
}

export async function parseReducersFromFile(file: string) {
  const text = await fs.readFile(file, 'utf8');
  return parseReducersFromText(text, file);
}
