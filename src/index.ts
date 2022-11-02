// https://ts-ast-viewer.com

import { SyntaxKind, Identifier } from "typescript";
import * as ts from "typescript";
import * as glob from "glob";
import { allActions, rootDir } from "./assets/all-actions";

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
  mapNodes
    .filter(node => node.kind === SyntaxKind.CallExpression)
    .forEach(mapNode => {
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

  return [...new Set(actions.filter(action => !input.includes(action)))];
}

function getEffectActionsMap(sourceFile: any) {
  const effectBodies = getParentNodes(sourceFile, ["createEffect"]);
  return effectBodies.reduce((sum, { parent: effect }) => {
    const key = effect.name.escapedText.toString();
    const input = effectTriggeringActions(effect);
    const output = effectDispatchedActions(effect, sourceFile, input);
    return { ...sum, [key]: { input, output } };
  }, {});
}

function readSourceFile(file: string): ts.SourceFile {
  const options: ts.CompilerOptions = { allowJs: true };
  const compilerHost = ts.createCompilerHost(
    options,
    /* setParentNodes */ true
  );
  let program = ts.createProgram([file], options, compilerHost);
  return program.getSourceFile(file);
}

function mapeffectsToActions(rootDir: string) {
  glob("**/assets/*.effects.ts", function (err, files) {
  // glob(rootDir + "**/**/*.effects.ts", function (err, files) {
    let effectActionsMap = files.reduce((result, filename) => {
      console.log("🚀 ~ processing effect", filename);
      return { ...result, ...getEffectActionsMap(readSourceFile(filename)) };
    }, {});
    console.dir(effectActionsMap, { depth: null });
  });
}

function getComponentDispatchedActions(sourceFile: ts.SourceFile) {
  let className = "";
  ts.forEachChild(sourceFile, node => {
    if (node.kind === SyntaxKind.ClassDeclaration) {
      className = (node as ts.ClassDeclaration).name.escapedText.toString();
    }
  });
  const nodes = getParentNodes(sourceFile, ["dispatch"]).map(node =>
    node.parent.getText()
  );
  const actions = [
    ...new Set(
      allActions.filter(
        action => nodes.filter(node => node.includes(action)).length
      )
    ),
  ];
  return { [className]: actions };
}

function mapComponentToActions(rootDir: string) {
  glob("**/assets/*.component.ts", function (err, files) {
  // glob(rootDir + "**/**/*.component.ts", function (err, files) {
    let componentActions = files.reduce((result, filename) => {
      console.log("🚀 ~ processing component", filename);
      return {
        ...result,
        ...getComponentDispatchedActions(readSourceFile(filename)),
      };
    }, {});
    componentActions = Object.fromEntries(
      Object.entries(componentActions).filter(([k, v]) => v !== 0)
    );
    console.dir(componentActions, { depth: null });
  });
}

mapeffectsToActions(rootDir);
mapComponentToActions(rootDir);

// TODO: use in reducers
