import path from 'path';
import { CallExpression, Project, PropertyAccessExpression, SyntaxKind } from 'ts-morph';

/**
 * Parse components and detect actions dispatched from components.
 * Returns a map: componentName -> array of dispatched action creator names.
 */
export function parseComponents(srcDir: string): Record<string, string[]> {
  const project = new Project({ tsConfigFilePath: undefined });
  const globPath = path.join(srcDir, '**', '*.ts');
  const sourceFiles = project.addSourceFilesAtPaths(globPath);

  const result: Record<string, string[]> = {};

  for (const sf of sourceFiles) {
    const classes = sf.getClasses();
    for (const cls of classes) {
      const hasComponentDecorator = cls.getDecorators().some(d => d.getName && d.getName() === 'Component');
      if (!hasComponentDecorator) continue;

      const compName = cls.getName() || '<anonymous>';
      const actions = new Set<string>();

      const calls = cls.getDescendantsOfKind(SyntaxKind.CallExpression);
      for (const call of calls) {
        const expr = call.getExpression();
        if (!expr) continue;

        if (expr.getKind && expr.getKind() === SyntaxKind.PropertyAccessExpression) {
          const propName = (expr as PropertyAccessExpression).getName();
          if (propName !== 'dispatch') continue;

          const args = call.getArguments();
          if (!args || args.length === 0) continue;

          const first = args[0];
          if (first.getKind && first.getKind() === SyntaxKind.CallExpression) {
            const actionCall = first as CallExpression;
            const actionExpr = actionCall.getExpression();
            if (actionExpr) {
              const actionName = actionExpr.getText();
              actions.add(actionName);
            }
          }
        }
      }

      result[compName] = Array.from(actions);
    }
  }

  return result;
}

export default parseComponents;
