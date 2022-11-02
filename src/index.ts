// https://ts-ast-viewer.com

import { SyntaxKind, Identifier } from "typescript";
import { join } from "path";
import * as ts from "typescript";
import * as glob from "glob";
import { allActions } from "./assets/all-actions";

function getParentNodes(node: ts.Node, identifiers: string[]) {
  if (
    node.kind == SyntaxKind.Identifier &&
    identifiers.includes((node as Identifier).escapedText.toString()) &&
    node.parent.kind !== SyntaxKind.ImportSpecifier
  ) {
    return [node.parent];
  }
  let nodes = [];
  node.forEachChild(child => {
    const idenNode = getParentNodes(child, identifiers);
    if (idenNode.length) {
      nodes = [...nodes, ...idenNode];
    }
  });
  return nodes;
}

function effectTriggeringActions(effect: any) {
  return getParentNodes(effect, ["ofType"])
    .map(node => node.arguments.map(arg => arg.escapedText))
    .flat();
}

function effectDispatchedActions(
  effect: any,
  sourceFile: ts.SourceFile,
  input: string[]
) {
  const mapNodes = getParentNodes(effect, [
    "map",
    "switchMap",
    "concatMap",
    "exhoustMap",
    "mergeMap",
  ]);
  let actions = [];
  mapNodes.forEach(mapNode => {
    actions = [
      ...actions,
      ...allActions.filter(action => mapNode.getText().includes(action)),
    ];
    ts.forEachChild(mapNode.arguments[0], (node: any) => {
      if (node.kind === SyntaxKind.CallExpression && node.expression.name) {
        const privateMethodName = node.expression.name.escapedText.toString();
        const callables = getParentNodes(sourceFile, privateMethodName);
        callables.forEach(callable => {
          if (callable.kind === SyntaxKind.PropertyDeclaration) {
            actions = [
              ...actions,
              ...allActions.filter(action =>
                callable.getText().includes(action)
              ),
            ];
          }
        });
      }
    });
  });

  return [...new Set(actions.filter(action => !input.includes(action)))]
}

function getEffectActionsMap(sourceFile: any) {
  const effectBodies = getParentNodes(sourceFile, ["createEffect"]);
  return effectBodies.map(({ parent: effect }) => {
    const key = effect.name.escapedText.toString();
    const input = effectTriggeringActions(effect);
    const output = effectDispatchedActions(effect, sourceFile, input);
    return {
      [key]: { input, output },
    };
  });
}


function extract(file: string, identifiers: string[]): void {
  const options: ts.CompilerOptions = { allowJs: true };
  const compilerHost = ts.createCompilerHost(
    options,
    /* setParentNodes */ true
  );
  let program = ts.createProgram([file], options, compilerHost);
  const sourceFile = program.getSourceFile(file);
  const effectActionsMap = getEffectActionsMap(sourceFile);
  console.dir(effectActionsMap, { depth: null })
}

glob("**/assets/*.effects.ts", function (err, files) {
  files.forEach(filename => {
    const fullFileName = join(__dirname, "../", filename);
    extract(fullFileName, []);
  });
});

// TODO: dispatch from component
// TODO: use in reducers
