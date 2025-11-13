import path from 'path';
import { ArrayLiteralExpression, CallExpression, FunctionLikeDeclaration, Node, ParameterDeclaration, Project, PropertyDeclaration, SyntaxKind } from 'ts-morph';
import { parseActions } from './actions';

export type EffectInfo = { name: string; input: string[]; output: string[] };

/**
 * Parse effects and extract ofType inputs and output action creators.
 * Only records outputs that match known action creator names found in the project.
 */
export function parseEffects(srcDir: string): Record<string, { input: string[]; output: string[] }> {
  const project = new Project({ tsConfigFilePath: undefined });
  const globPath = path.join(srcDir, '**', '*.ts');
  const sourceFiles = project.addSourceFilesAtPaths(globPath);

  const actionNames = new Set(parseActions(srcDir).map(a => a.name));

  const result: Record<string, { input: string[]; output: string[] }> = {};

  for (const sf of sourceFiles) {
    const classes = sf.getClasses();
    for (const cls of classes) {
      const hasInjectable = cls.getDecorators().some(d => d.getName && d.getName() === 'Injectable');
      if (!hasInjectable) continue;

      const props = cls.getInstanceProperties();
      for (const p of props) {
        const name = p.getName();
        const propDecl = p as unknown as PropertyDeclaration;
        const initializer = propDecl.getInitializer && propDecl.getInitializer();
        if (!initializer) continue;

        // look for createEffect(() => this.actions$.pipe(...))
        if (initializer.getKind && initializer.getKind() === SyntaxKind.CallExpression) {
          const callExpr = initializer as CallExpression;
          const exprName = callExpr.getExpression().getText();
          if (exprName !== 'createEffect') continue;

          const arrow = callExpr.getArguments()[0];
          const inputs: string[] = [];
          const outputs: string[] = [];

          if (arrow) {
            const desc = arrow.getDescendants();
            // find ofType call and collect its arguments as inputs
            for (const d of desc) {
              if (d.getKind && d.getKind() === SyntaxKind.CallExpression) {
                const call = d as CallExpression;
                const expr = call.getExpression().getText && call.getExpression().getText();
                if (expr === 'ofType') {
                  const args = call.getArguments();
                  for (const a of args) {
                    inputs.push(a.getText());
                  }
                }
              }
            }

            // detect array literal returns like [action2(), action3()]
            const arrayLits = arrow.getDescendantsOfKind(SyntaxKind.ArrayLiteralExpression) as ArrayLiteralExpression[];
            for (const arr of arrayLits) {
              const elems = arr.getElements();
              for (const e of elems) {
                if (e.getKind && e.getKind() === SyntaxKind.CallExpression) {
                  const called = (e as CallExpression).getExpression().getText();
                  if (actionNames.has(called)) outputs.push(called);
                }
              }
            }

            // detect direct calls to action creators inside the arrow body, e.g., map(({ action }) => nestedAction2({ action: action() }))
            const callExprs = arrow.getDescendantsOfKind(SyntaxKind.CallExpression) as CallExpression[];
            for (const c of callExprs) {
              const exprNode = c.getExpression();
              if (!exprNode) continue;
              const callee = exprNode.getText();

              // include if it's a known action creator
              let include = false;
              if (actionNames.has(callee)) include = true;

              // or if it's a simple identifier (like payload action parameter `action()`) and not an operator name
              const rxOperators = new Set(['map', 'switchMap', 'mergeMap', 'concatMap', 'ofType']);
              if (!include && exprNode.getKind && exprNode.getKind() === SyntaxKind.Identifier && !rxOperators.has(callee)) {
                // ensure the identifier isn't a parameter of an enclosing function (including destructured params)
                let isParam = false;
                let walker: Node | undefined = c as unknown as Node;
                while (walker) {
                  const kind = walker.getKind && walker.getKind();
                  if (kind === SyntaxKind.ArrowFunction || kind === SyntaxKind.FunctionExpression || kind === SyntaxKind.FunctionDeclaration) {
                    const maybeFn = walker as unknown as FunctionLikeDeclaration;
                    const params: ParameterDeclaration[] = typeof maybeFn.getParameters === 'function' ? maybeFn.getParameters() : [];
                    for (const p of params) {
                      // find any identifier descendants of the parameter (covers destructuring)
                      const ids = (p as Node).getDescendantsOfKind(SyntaxKind.Identifier);
                      for (const id of ids) {
                        if (id.getText && id.getText() === callee) {
                          isParam = true;
                          break;
                        }
                      }
                      if (isParam) break;
                    }
                    if (isParam) break;
                  }
                  walker = (walker as Node).getParent && (walker as Node).getParent();
                }
                if (!isParam) include = true;
              }

              if (!include) {
                // if the callee is a parameter (e.g., `action()` from a destructured param),
                // mark this effect as dispatching the payload action via a special token
                let parent = c as Node | undefined;
                let isParamCall = false;
                while (parent) {
                  const kind = parent.getKind && parent.getKind();
                  if (kind === SyntaxKind.ArrowFunction || kind === SyntaxKind.FunctionExpression || kind === SyntaxKind.FunctionDeclaration) {
                    const maybeFn = parent as unknown as FunctionLikeDeclaration;
                    const params: ParameterDeclaration[] = typeof maybeFn.getParameters === 'function' ? maybeFn.getParameters() : [];
                    for (const p of params) {
                      const ids = (p as Node).getDescendantsOfKind(SyntaxKind.Identifier);
                      for (const id of ids) {
                        if (id.getText && id.getText() === callee) {
                          isParamCall = true;
                          break;
                        }
                      }
                      if (isParamCall) break;
                    }
                    break;
                  }
                  parent = (parent as Node).getParent && (parent as Node).getParent();
                }
                if (isParamCall) {
                  // parameter-call payloads are handled by assembler loadedActions detection;
                  // do not emit special tokens here to keep effects outputs limited to known action creators.
                  continue;
                }
                continue;
              }

              // ignore action calls that are nested as arguments to other action creator calls
              let parent = c.getParent();
              let nestedInOtherAction = false;
              while (parent) {
                if (parent.getKind && parent.getKind() === SyntaxKind.CallExpression && parent !== c) {
                  const parentCallee = (parent as CallExpression).getExpression().getText();
                  if (actionNames.has(parentCallee)) {
                    nestedInOtherAction = true;
                    break;
                  }
                }
                parent = (parent as Node).getParent && (parent as Node).getParent();
              }
              if (nestedInOtherAction) continue;

              outputs.push(callee);
            }
          }

          result[name] = { input: Array.from(new Set(inputs)), output: Array.from(new Set(outputs)) };
        }
      }
    }
  }

  return result;
}

export default parseEffects;
