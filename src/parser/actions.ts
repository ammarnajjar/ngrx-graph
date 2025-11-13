import path from 'path';
import { Project, SyntaxKind, VariableDeclaration } from 'ts-morph';

export type ActionInfo = { name: string; nested: boolean };

/**
 * Parse action creator exports from a source directory.
 * Returns array of action names and whether they are nested (have props that include Action)
 */
export function parseActions(srcDir: string): ActionInfo[] {
  const project = new Project({ tsConfigFilePath: undefined });

  const globPath = path.join(srcDir, '**', '*.ts');
  const sourceFiles = project.addSourceFilesAtPaths(globPath);

  const actions: ActionInfo[] = [];

  for (const sf of sourceFiles) {
    const exports = sf.getExportedDeclarations();
    for (const [name, decls] of exports.entries()) {
      for (const d of decls) {
        // look for variable export with initializer being a call to createAction
        // narrow to VariableDeclaration when possible
        const varDecl = (d as unknown) as VariableDeclaration;
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
                  // simple heuristic: if props's type mentions 'Action' consider nested
                  if (/Action/.test(text)) nested = true;
                }
              }
            }

            actions.push({ name, nested });
          }
        }
      }
    }
  }

  return actions;
}

export default parseActions;
