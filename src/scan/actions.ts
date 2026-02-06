import fs from 'fs/promises';
import path from 'path';
import ts from 'typescript';
import { createSource, getStringLiteralText, getUnquotedText, isIdentifierNamed } from './utils';

export type ActionKind = 'createAction' | 'createActionGroup' | 'class';

export interface ActionInfo {
  file: string;
  kind: ActionKind;
  name?: string;
  type?: string;
  hasProps?: boolean;
  nested?: boolean;
  propsTypeText?: string;
  aliasedFrom?: string;
}

function visitCreateAction(declName: string | undefined, call: ts.CallExpression, file: string): ActionInfo | null {
  const args = call.arguments;
  const typeArg = args[0];
  const type = getStringLiteralText(typeArg as ts.Node);
  let hasProps = false;
  if (args.length > 1) {
    const second = args[1];
    if (ts.isCallExpression(second)) {
      const expr = second.expression;
      if (isIdentifierNamed(expr, 'props')) {
        hasProps = true;
        const parts: string[] = [];
        if (second.typeArguments && second.typeArguments.length) {
          for (const ta of second.typeArguments) parts.push(ta.getText());
        }
        if (second.arguments && second.arguments.length) {
          for (const a of second.arguments) parts.push(a.getText());
        }
        const propsTypeText = parts.join(' ');
        return { file, kind: 'createAction', name: declName, type, hasProps, nested: false, propsTypeText };
      }
    }
  }
  return { file, kind: 'createAction', name: declName, type, hasProps, nested: false };
}

function visitCreateActionGroup(call: ts.CallExpression, file: string): ActionInfo[] {
  const res: ActionInfo[] = [];
  const args = call.arguments;
  if (!args.length) return res;
  const first = args[0];
  if (!ts.isObjectLiteralExpression(first)) return res;
  const events = first.properties.find(p => {
    return ts.isPropertyAssignment(p) && (p.name.getText() === 'events' || p.name.getText() === 'sourceEvents');
  }) as ts.PropertyAssignment | undefined;
  if (!events) return res;
  if (!ts.isObjectLiteralExpression(events.initializer)) return res;
  for (const prop of events.initializer.properties) {
    if (ts.isPropertyAssignment(prop)) {
      const name = getUnquotedText(prop.name);
      const initializer = prop.initializer;
      let hasProps = false;
      let propsTypeText: string | undefined;
      if (
        ts.isCallExpression(initializer) &&
        ts.isIdentifier(initializer.expression) &&
        initializer.expression.text === 'props'
      ) {
        hasProps = true;
        const parts: string[] = [];
        if (initializer.typeArguments && initializer.typeArguments.length) {
          for (const ta of initializer.typeArguments) parts.push(ta.getText());
        }
        if (initializer.arguments && initializer.arguments.length) {
          for (const a of initializer.arguments) parts.push(a.getText());
        }
        propsTypeText = parts.join(' ');
      }
      res.push({ file, kind: 'createActionGroup', name, type: undefined, hasProps, propsTypeText });
    }
  }
  return res;
}

function visitVariableStatement(node: ts.VariableStatement, file: string): ActionInfo[] {
  const results: ActionInfo[] = [];
  const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  for (const decl of node.declarationList.declarations) {
    const name = decl.name && ts.isIdentifier(decl.name) ? decl.name.text : undefined;
    const init = decl.initializer;
    if (init && ts.isCallExpression(init)) {
      const expr = init.expression;
      if (isIdentifierNamed(expr, 'createAction')) {
        const info = visitCreateAction(isExported ? name : name, init, file);
        if (info) {
          info.nested = false;
          results.push(info);
        }
      } else if (isIdentifierNamed(expr, 'createActionGroup')) {
        const group = visitCreateActionGroup(init, file);
        for (const g of group) g.nested = false;
        results.push(...group);
      }
    }
  }
  return results;
}

function visitPropertyAssignment(node: ts.PropertyAssignment, file: string): ActionInfo | null {
  const init = node.initializer;
  if (init && ts.isCallExpression(init)) {
    const expr = init.expression;
    if (isIdentifierNamed(expr, 'createAction')) {
      const name = getUnquotedText(node.name);
      const info = visitCreateAction(name, init, file);
      if (info) {
        info.nested = true;
        return info;
      }
    }
  }
  return null;
}

function visitClassDeclaration(node: ts.ClassDeclaration, file: string): ActionInfo | null {
  const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  if (!isExported) return null;

  const name = node.name?.text;
  let actionType: string | undefined;
  for (const member of node.members) {
    if (
      ts.isPropertyDeclaration(member) &&
      member.name &&
      member.name.getText() === 'type' &&
      member.initializer
    ) {
      const t = getStringLiteralText(member.initializer);
      if (t) actionType = t;
    }
  }
  if (actionType || node.heritageClauses?.some(h => h.getText().includes('Action'))) {
    return { file, kind: 'class', name, type: actionType };
  }
  return null;
}

async function resolveReExports(
  sf: ts.SourceFile,
  file: string,
  visited: Set<string>
): Promise<ActionInfo[]> {
  const results: ActionInfo[] = [];
  for (const stmt of sf.statements) {
    if (!ts.isExportDeclaration(stmt) || !stmt.moduleSpecifier || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const spec = stmt.moduleSpecifier.text;
    if (!spec.startsWith('.')) continue;
    const exportClause = stmt.exportClause;
    if (!exportClause || !ts.isNamedExports(exportClause)) continue;

    const baseDir = path.dirname(file);
    const candidates = [
      path.resolve(baseDir, spec + '.ts'),
      path.resolve(baseDir, spec + '.tsx'),
      path.resolve(baseDir, spec, 'index.ts'),
      path.resolve(baseDir, spec, 'index.tsx'),
    ];
    let target: string | undefined;
    for (const c of candidates) {
      const st = await fs.stat(c).catch(() => null);
      if (st && st.isFile()) {
        target = c;
        break;
      }
    }
    if (!target) continue;

    const importedActions = await parseActionsFromFile(target, visited).catch(() => [] as ActionInfo[]);
    for (const specEl of exportClause.elements) {
      const exportedName = specEl.name.text;
      const origName = specEl.propertyName ? specEl.propertyName.text : exportedName;
      for (const ia of importedActions) {
        if (ia.name === origName) {
          const aliased: ActionInfo = { ...ia, name: exportedName, file, aliasedFrom: origName };
          results.push(aliased);
        }
      }
    }
  }
  return results;
}

export async function parseActionsFromText(
  text: string,
  file = 'file.ts',
  visited = new Set<string>(),
): Promise<ActionInfo[]> {
  const sf = createSource(text, file);
  const results: ActionInfo[] = [];
  const resolvedFile = path.resolve(file);
  if (visited.has(resolvedFile)) return results;
  visited.add(resolvedFile);

  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node)) {
      results.push(...visitVariableStatement(node, file));
    }

    if (ts.isPropertyAssignment(node)) {
      const info = visitPropertyAssignment(node, file);
      if (info) results.push(info);
    }

    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (isIdentifierNamed(expr, 'createActionGroup')) {
        results.push(...visitCreateActionGroup(node, file));
      }
    }

    if (ts.isClassDeclaration(node)) {
      const info = visitClassDeclaration(node, file);
      if (info) results.push(info);
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);

  const reExported = await resolveReExports(sf, file, visited);
  results.push(...reExported);

  return results;
}

export async function parseActionsFromFile(file: string, visited?: Set<string>) {
  const text = await fs.readFile(file, 'utf8');
  return parseActionsFromText(text, file, visited);
}
