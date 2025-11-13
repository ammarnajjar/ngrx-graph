import path from 'path';
import { Project, SyntaxKind } from 'ts-morph';

/**
 * Parse reducers and detect which actions are handled by on(...)
 */
export function parseReducers(srcDir: string, filePaths?: string[]): Record<string, string[]> {
  const project = new Project({ tsConfigFilePath: undefined });
  const sourceFiles = filePaths && filePaths.length > 0
    ? project.addSourceFilesAtPaths(filePaths)
    : project.addSourceFilesAtPaths(path.join(srcDir, '**', '*.ts'));

  const result: Record<string, string[]> = {};

  for (const sf of sourceFiles) {
    // Find all `on(...)` call expressions and map them to their enclosing reducer variable
    const callExprs = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const callExpr of callExprs) {
      const exprText = callExpr.getExpression().getText();
      if (exprText !== 'on') continue;

      const onArgs = callExpr.getArguments();
      if (!onArgs || onArgs.length === 0) continue;

      const first = onArgs[0];
      const actionText = first.getText();

      // find enclosing variable declaration (reducer variable)
      const varDecl = callExpr.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
      if (!varDecl) continue;
      const varName = varDecl.getName();

      if (!result[varName]) result[varName] = [];
      if (result[varName].indexOf(actionText) === -1) result[varName].push(actionText);
    }
  }

  return result;
}

export default parseReducers;
