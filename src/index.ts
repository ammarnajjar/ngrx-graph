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
  return {
    input: getParentNodes(effect, ["ofType"])
      .map(node => node.arguments.map(arg => arg.escapedText))
      .flat(),
  };
}

function triggeringActions(node: any) {
  const effectBodies = getParentNodes(node, ["createEffect"]);
  return effectBodies.map(({ parent: effect }) => {
    const key = effect.name.escapedText.toString();
    return {
      [key]: {
        ...effectTriggeringActions(effect),
        ...effectDispatchedActions(effect),
      },
    };
  });
}

function effectDispatchedActions(effect: any) {
  return {
    output: getParentNodes(effect, [
      "switchMap",
      "map",
      "concatMap",
      "exhoustMap",
      "mergeMap",
    ])
      .map(node => allActions.filter(action => node.getText().includes(action)))
      .flat(),
  };
}

function extract(file: string, identifiers: string[]): void {
  const options: ts.CompilerOptions = { allowJs: true };
  const compilerHost = ts.createCompilerHost(
    options,
    /* setParentNodes */ true
  );
  let program = ts.createProgram([file], options, compilerHost);
  const sourceFile = program.getSourceFile(file);
  const actions = triggeringActions(sourceFile);
  actions.forEach(action => {
    console.log(action);
  });
}

glob("**/*.effects.ts", function (err, files) {
  files.forEach(filename => {
    const fullFileName = join(__dirname, "../", filename);
    extract(fullFileName, []);
  });
});

// TODO: method/function is called in effect to dispatch actions
// TODO: dispatch from component
// TODO: use in reducers
