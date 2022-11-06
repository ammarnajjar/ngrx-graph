// https://ts-ast-viewer.com

import * as fs from "node:fs";
import * as glob from "glob";

import {
  CallExpression,
  CompilerOptions,
  Identifier,
  Node,
  SourceFile,
  SyntaxKind,
  VariableDeclaration,
  createCompilerHost,
  createProgram,
  forEachChild,
  ClassDeclaration,
} from "typescript";
import { join } from "node:path";
import { isEmpty, uniq } from "lodash";
import { json } from "stream/consumers";

interface InputOutputMap {
  input: string[];
  output: string[];
}

interface ActionsMap {
  [k: string]: string[];
}

export class Generator {
  private srcDir: string = "";
  private outputDir: string = "";
  private structureFile: string = "";
  private structureSaved = false;
  private force = false;
  private fromEffects: { [k: string]: InputOutputMap } = {};
  private fromComponents: ActionsMap = {};
  private fromReucers: ActionsMap = {};
  allActions: string[] = [];

  constructor(
    srcDir: string,
    outputDir: string,
    structureFile: string,
    force: boolean
  ) {
    this.srcDir = srcDir;
    this.outputDir = outputDir;
    this.force = force;
    this.structureFile = join(this.outputDir, structureFile);
    const content = this.readStructure();
    if (content !== undefined) {
      this.allActions = content.allActions;
      this.fromComponents = content.fromComponents;
      this.fromEffects = content.fromEffects;
      this.fromReucers = content.fromReducers;
    }
    this.allActions = isEmpty(this.allActions)
      ? this.getAllActions()
      : this.allActions;
  }

  getParentNodes(node: Node, identifiers: string[]) {
    if (
      node.kind === SyntaxKind.Identifier &&
      identifiers.includes((node as Identifier).escapedText.toString()) &&
      node.parent.kind !== SyntaxKind.ImportSpecifier
    ) {
      return [node.parent];
    }

    let nodes: Node[] = [];
    node.forEachChild(child => {
      const idenNode = this.getParentNodes(child, identifiers);
      if (idenNode.length > 0) {
        nodes = [...nodes, ...idenNode];
      }
    });
    return nodes;
  }

  getAllActions(): string[] {
    console.log("🚀 ~ getAllActions");
    const allActions = glob
      .sync(join(this.srcDir, "**/*.actions.ts"))
      .reduce((result: string[], filename: string) => {
        console.log("processing", filename);
        const actionPerFile = this.getParentNodes(readSourceFile(filename), [
          "createAction",
        ]).map(node =>
          (
            (node.parent as VariableDeclaration).name as Identifier
          ).escapedText.toString()
        );
        return [...result, ...actionPerFile];
      }, []);
    allActions.forEach(action => {
      console.log(action);
    });
    return allActions;
  }

  reducerActions(reducer: Node) {
    return this.getParentNodes(reducer, ["on"]).flatMap(node =>
      (
        (node as CallExpression).arguments[0] as Identifier
      ).escapedText.toString()
    );
  }

  reducerActionsMap(sourceFile: Node): ActionsMap {
    // one reducer per file
    const reducer = this.getParentNodes(sourceFile, ["createReducer"])[0];
    const reducerName = (
      (reducer.parent as VariableDeclaration).name as Identifier
    ).escapedText.toString();
    return { [reducerName]: this.reducerActions(reducer) };
  }

  mapReducersToActions(): ActionsMap {
    console.log("🚀 ~ mapReducersToActions");
    if (!this.force && this.structureSaved) {
      console.log("Reading for a previously saved structure");
      return this.fromReucers;
    }
    let reducerActionsMap = glob
      .sync(join(this.srcDir, "**/*.reducer.ts"))
      .reduce((result, filename) => {
        console.log("processing", filename);
        return {
          ...result,
          ...this.reducerActionsMap(readSourceFile(filename)),
        };
      }, {});
    console.dir(reducerActionsMap, { depth: null });
    return reducerActionsMap;
  }

  effectTriggeringActions(effect: any) {
    return this.getParentNodes(effect, ["ofType"]).flatMap(node =>
      (node as CallExpression).arguments.map(arg =>
        (arg as Identifier).escapedText.toString()
      )
    );
  }

  effectDispatchedActions(
    effect: any,
    sourceFile: SourceFile,
    input: string[]
  ) {
    const mapNodes = this.getParentNodes(effect, [
      "map",
      "switchMap",
      "concatMap",
      "exhoustMap",
      "mergeMap",
    ]);
    let actions: string[] = [];
    for (const mapNode of mapNodes.filter(
      node => node.kind === SyntaxKind.CallExpression
    )) {
      actions = [
        ...actions,
        ...this.allActions.filter((action: string) =>
          mapNode.getText().match(new RegExp(`[^\w]${action}\\(`))
        ),
      ];
      forEachChild((mapNode as CallExpression).arguments[0], (node: any) => {
        if (node.kind === SyntaxKind.CallExpression && node.expression.name) {
          const privateMethodName = node.expression.name.escapedText.toString();
          const callables = this.getParentNodes(sourceFile, privateMethodName);
          for (const callable of callables) {
            if (callable.kind === SyntaxKind.PropertyDeclaration) {
              actions = [
                ...actions,
                ...this.allActions.filter((action: string) =>
                  callable.getText().match(new RegExp(`[^\w]${action}\\(`))
                ),
              ];
            }
          }
        }
      });
    }

    return [...new Set(actions.filter(action => !input.includes(action)))];
  }

  getEffectActionsMap(sourceFile: any) {
    const effectBodies = this.getParentNodes(sourceFile, ["createEffect"]);
    return effectBodies.reduce((sum, { parent: effect }) => {
      const key = (
        (effect as VariableDeclaration).name as Identifier
      ).escapedText.toString();
      const input = this.effectTriggeringActions(effect);
      const output = this.effectDispatchedActions(effect, sourceFile, input);
      return { ...sum, [key]: { input, output } };
    }, {});
  }

  mapeffectsToActions(): { [k: string]: InputOutputMap } {
    console.log("🚀 ~ mapeffectsToActions");
    if (!this.force && this.structureSaved) {
      console.log("Reading for a previously saved structure");
      return this.fromEffects;
    }
    const effectActionsMap = glob
      .sync(join(this.srcDir, "**/*.effects.ts"))
      .reduce((result, filename) => {
        console.log("processing", filename);
        return {
          ...result,
          ...this.getEffectActionsMap(readSourceFile(filename)),
        };
      }, {});
    console.dir(effectActionsMap, { depth: null });
    return effectActionsMap;
  }

  getComponentDispatchedActions(sourceFile: SourceFile) {
    let className = "";
    forEachChild(sourceFile, node => {
      if (node.kind === SyntaxKind.ClassDeclaration) {
        className = (
          (node as ClassDeclaration).name as Identifier
        ).escapedText.toString();
      }
    });
    const nodes = this.getParentNodes(sourceFile, ["dispatch"]).map(node =>
      node.parent.getText()
    );
    const actions = [
      ...new Set(
        this.allActions.filter(
          (action: string) => nodes.filter(node => node.includes(action)).length
        )
      ),
    ];
    return { [className]: actions };
  }

  mapComponentToActions(): ActionsMap {
    console.log("🚀 ~ mapComponentToActions");
    if (!this.force && this.structureSaved) {
      console.log("Reading for a previously saved structure");
      return this.fromComponents;
    }
    let componentActionsMap = glob
      .sync(join(this.srcDir, "**/*.component.ts"))
      .reduce((result, filename) => {
        console.log("processing", filename);
        return {
          ...result,
          ...this.getComponentDispatchedActions(readSourceFile(filename)),
        };
      }, {});
    componentActionsMap = Object.fromEntries(
      Object.entries(componentActionsMap).filter(([, v]) => v !== 0)
    );
    console.dir(componentActionsMap, { depth: null });
    return componentActionsMap;
  }

  readStructure():
    | {
        allActions: string[];
        fromComponents: ActionsMap;
        fromEffects: { [k: string]: InputOutputMap };
        fromReducers: ActionsMap;
      }
    | undefined {
    this.structureSaved = fs.existsSync(this.structureFile);
    if (!this.structureSaved) {
      console.log("Running for the first time");
      return;
    }
    return JSON.parse(fs.readFileSync(this.structureFile, "utf-8"));
  }

  saveStructure(
    fromComponents: ActionsMap,
    fromEffects: { [key: string]: InputOutputMap },
    fromReducers: ActionsMap
  ) {
    if (!this.force && this.structureSaved) {
      console.log("Structure already saved");
      return;
    }
    if (fs.existsSync(this.structureFile)) {
      fs.unlinkSync(this.structureFile);
    }
    const content = JSON.stringify({
      ...{ allActions: this.allActions },
      ...{ fromComponents },
      ...{ fromEffects },
      ...{ fromReducers },
    });
    fs.writeFileSync(this.structureFile, content);
  }

  generateActionGraph(
    action: string,
    fromComponents: ActionsMap,
    fromEffects: { [key: string]: InputOutputMap },
    fromReducers: ActionsMap
  ) {
    console.log(`🚀 ~ generateActionGraph for ${action}`);
    const dotFile = join(this.outputDir, `${action}.dot`);
    if (fs.existsSync(dotFile)) {
      if (!this.force) {
        console.log("Structure already saved");
        return;
      }
      fs.unlinkSync(dotFile);
    }
    const filterdByAction = [
      ...chainActionsByInput(fromEffects, action),
      ...chainActionsByOutput(fromEffects, action),
    ];
    let content = "digraph {\n";
    Object.entries(fromComponents).map(([k, v]) => {
      const lines = v.map(o => {
        if (
          filterdByAction.some(a => a.input.includes(o) || a.output.includes(o))
        ) {
          return `${k} -> ${o}\n`;
        }
      });
      content += lines.join("");
    });
    Object.entries(fromReducers).map(([k, v]) => {
      const lines = v.map(o => {
        if (
          filterdByAction.some(a => a.input.includes(o) || a.output.includes(o))
        ) {
          return `${o} -> ${k}\n`;
        }
      });
      content += lines.join("");
    });
    filterdByAction.map((v: InputOutputMap) => {
      const lines = v.output.map(o => `${v.input} -> ${o}\n`);
      content += lines.join("");
    });
    content += "}\n";
    console.log("🚀 ~ content", content);
    fs.writeFileSync(dotFile, content);
  }

  generateAllGraph(
    fromComponents: ActionsMap,
    fromEffects: { [key: string]: InputOutputMap },
    fromReducers: ActionsMap
  ) {
    console.log("🚀 ~ generateAllGraph");
    const dotFile = join(this.outputDir, "all.dot");
    if (fs.existsSync(dotFile)) {
      fs.unlinkSync(dotFile);
    }
    let content = "digraph {\n";
    Object.entries(fromComponents).map(([k, v]) => {
      const lines = v.map(o => `${k} -> ${o}\n`);
      content += lines.join("");
    });
    Object.entries(fromReducers).map(([k, v]) => {
      const lines = v.map(o => `${o} -> ${k}\n`);
      content += lines.join("");
    });
    Object.values(fromEffects).map((v: InputOutputMap) => {
      const lines = v.output.map(o => `${v.input} -> ${o}\n`);
      content += lines.join("");
    });
    content += "}\n";
    fs.writeFileSync(dotFile, content);
  }
}

function readSourceFile(file: string): SourceFile {
  const options: CompilerOptions = { allowJs: true };
  const compilerHost = createCompilerHost(options, /* setParentNodes */ true);
  const program = createProgram([file], options, compilerHost);
  return program.getSourceFile(file) as SourceFile;
}

export function chainActionsByInput(
  fromEffects: { [k: string]: InputOutputMap },
  action: string
): InputOutputMap[] {
  console.log("🚀 ~ chainActionsByInput", chainActionsByInput);
  try {
    return Object.values(fromEffects).reduce(
      (result: InputOutputMap[], v: InputOutputMap) => {
        if (v.input.includes(action)) {
          console.log("🚀 ~ v", v);
          const chainedPerEffect = v.output.flatMap(obj =>
            chainActionsByInput(fromEffects, obj)
          );
          return uniq([...result, v, ...chainedPerEffect]);
        }
        return result;
      },
      []
    );
  } catch (RangeError) {
    console.log(`ERROR: ${action} might have circular dispatch graph`);
    return [];
  }
}

export function chainActionsByOutput(
  fromEffects: { [k: string]: InputOutputMap },
  action: string
): InputOutputMap[] {
  console.log("🚀 ~ chainActionsByOutput", chainActionsByOutput);
  try {
    return Object.values(fromEffects).reduce(
      (result: InputOutputMap[], v: InputOutputMap) => {
        if (v.output.includes(action)) {
          const chainedPerEffect = v.input.flatMap(obj =>
            chainActionsByOutput(fromEffects, obj)
          );
          return uniq([...result, v, ...chainedPerEffect]);
        }
        return result;
      },
      []
    );
  } catch (RangeError) {
    // circular action calls e.g: userAuthenticated
    console.log(`ERROR: ${action} might have circular dispatch graph`);
    return [];
  }
}
