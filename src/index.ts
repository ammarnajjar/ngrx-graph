// https://ts-ast-viewer.com

import * as fs from "fs";
import * as glob from "glob";
import * as ts from "typescript";

import { SyntaxKind, Identifier } from "typescript";
import { basename, join } from "path";
import { exec } from "child_process";
import { allActions, rootDir } from "./assets/env";
import { resourceLimits } from "worker_threads";

interface InputOutputMap {
  input: string[];
  output: string[];
}

// const allActions = getAllActions(rootDir);

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

function getAllActions(rootDir: string): string[] {
  let allActions = glob
    .sync(rootDir + "**/**/*.actions.ts")
    .reduce((result, filename) => {
      console.log("🚀 ~ processing", basename(filename));
      const actionPerFile = getParentNodes(readSourceFile(filename), [
        "createAction",
      ]).map(node => node.parent.name.escapedText.toString());
      return [...result, ...actionPerFile];
    }, []);
  // allActions.forEach(action => {
  //   console.log(action);
  // });
  return allActions;
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

function mapeffectsToActions(rootDir: string): { [k: string]: InputOutputMap } {
  const effectActionsMap = glob
    .sync(rootDir + "**/**/*.effects.ts")
    .reduce((result, filename) => {
      console.log("🚀 ~ processing", basename(filename));
      return { ...result, ...getEffectActionsMap(readSourceFile(filename)) };
    }, {});
  console.dir(effectActionsMap, { depth: null });
  return effectActionsMap;
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
  let componentActionsMap = glob
    .sync(rootDir + "**/**/*.component.ts")
    .reduce((result, filename) => {
      console.log("🚀 ~ processing", basename(filename));
      return {
        ...result,
        ...getComponentDispatchedActions(readSourceFile(filename)),
      };
    }, {});
  componentActionsMap = Object.fromEntries(
    Object.entries(componentActionsMap).filter(([, v]) => v !== 0)
  );
  console.dir(componentActionsMap, { depth: null });
  return componentActionsMap;
}

const action = "orderLoaded";
const fromEffects = mapeffectsToActions(rootDir);
const filterdByAction = [
  // ...chainActionsByInput(fromEffects, action),
  ...chainActionsByOutput(fromEffects, action),
];
console.dir(filterdByAction, { depth: null });

function chainActionsByInput(
  fromEffects: { [k: string]: InputOutputMap },
  action: string
): InputOutputMap[] {
  return Object.values(fromEffects).reduce(
    (result: InputOutputMap[], v: InputOutputMap) => {
      if (v.input.includes(action)) {
        const chainedPerEffect = v.output
          .map(obj => chainActionsByInput(fromEffects, obj))
          .flat();
        return [...result, v, ...chainedPerEffect];
      }
      return result;
    },
    []
  );
}

function chainActionsByOutput(
  fromEffects: { [k: string]: InputOutputMap },
  action: string
): InputOutputMap[] {
  return Object.values(fromEffects).reduce(
    (result: InputOutputMap[], v: InputOutputMap) => {
      if (v.output.includes(action)) {
        console.log('🚀 ~ v', v)
        const chainedPerEffect = v.input
          .map(obj => chainActionsByOutput(fromEffects, obj))
          .flat();
        return [...result, v, ...chainedPerEffect];
      }
      return result;
    },
    []
  );
}

// const fromComponents = mapComponentToActions(rootDir);

const dotFile = join(__dirname, "assets/out.dot");
if (fs.existsSync(dotFile)) {
  fs.unlinkSync(dotFile);
}
fs.writeFileSync(dotFile, "digraph {\n");
filterdByAction.map((v: InputOutputMap) => {
  const lines = v.output.map(o => `${v.input} -> ${o}\n`);
  fs.appendFileSync(dotFile, lines.join(""));
});
fs.appendFileSync(dotFile, "}\n");
exec(`dot -Tsvg ${dotFile} -o src/assets/out.svg`);

// TODO: use in reducers
