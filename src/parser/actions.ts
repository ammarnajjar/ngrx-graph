import path from 'path';
import { Node, Project, SyntaxKind } from 'ts-morph';

export type ActionInfo = { name: string; nested: boolean };

/**
 * Parse action creator exports from a source directory.
 * Returns array of action names and whether they are nested (have props that include Action)
 */
export function parseActions(srcDir: string, filePaths?: string[]): ActionInfo[] {
  const project = new Project({ tsConfigFilePath: undefined });

  const sourceFiles = filePaths && filePaths.length > 0
    ? project.addSourceFilesAtPaths(filePaths)
    : project.addSourceFilesAtPaths(path.join(srcDir, '**', '*.ts'));
  const actionMap: Map<string, { nested: boolean }> = new Map();

  for (const sf of sourceFiles) {
    const varDecls = sf.getVariableDeclarations();
    for (const varDecl of varDecls) {
      const name = varDecl.getName();
      const init = varDecl.getInitializer && varDecl.getInitializer();
      if (!init) continue;
      if (init.getKind && init.getKind() === SyntaxKind.CallExpression) {
        const callExpr = init as import('ts-morph').CallExpression;
        const exprText = callExpr.getExpression().getText();
        if (exprText === 'createAction') {
          // detect props presence by checking call args for a call expression to props
          const args = callExpr.getArguments();
          let nested = false;
          for (const a of args) {
            if (a.getKind && a.getKind() === SyntaxKind.CallExpression) {
              const innerExpr = (a as import('ts-morph').CallExpression).getExpression().getText();
              if (innerExpr === 'props') {
                const text = a.getText();
                if (/Action/.test(text)) nested = true;
              }
            }
          }

          const prev = actionMap.get(name);
          if (!prev) actionMap.set(name, { nested });
          else if (nested && !prev.nested) prev.nested = true;
        }
      }
    }
  }

  // build final actions list from actionMap (including any aliases added above)
  // Also include exported aliases (re-exports) that point to known action creators
  for (const sf of sourceFiles) {
    const exports = sf.getExportedDeclarations();
    for (const [exportedName, decls] of exports.entries()) {
      if (actionMap.has(exportedName)) continue;
      for (const d of decls) {
        const declNode = d as unknown as Node;
        const sym = declNode.getSymbol && declNode.getSymbol();
        if (!sym) continue;
        let aliased: import('ts-morph').Symbol | undefined;
        try {
          aliased = sym.getAliasedSymbol && sym.getAliasedSymbol();
        } catch {
          aliased = undefined;
        }
        const targetName = (aliased && aliased.getName && aliased.getName()) || sym.getName && sym.getName();
        if (targetName && actionMap.has(targetName)) {
          const info = actionMap.get(targetName)!;
          actionMap.set(exportedName, { nested: info.nested });
          break;
        }
      }
    }
  }
  // build final actions list from actionMap (including any aliases added above)
  const actions: ActionInfo[] = [];
  for (const [name, info] of actionMap.entries()) actions.push({ name, nested: info.nested });
  return actions;
}

export default parseActions;
