// https://ts-ast-viewer.com

import * as fs from 'node:fs';
import * as glob from 'glob';

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
  PropertyAccessExpression,
} from 'typescript';
import { join } from 'node:path';
import { isEmpty, uniq } from 'lodash';

interface InputOutputMap {
  input: string[];
  output: string[];
}

interface EffectsStructure {
  [k: string]: InputOutputMap;
}
interface ActionsMap {
  [k: string]: string[];
}

export class Generator {
  private srcDir = '';
  private outputDir = '';
  private structureFile = '';
  private structureSaved = false;
  private force = false;
  private fromEffects: EffectsStructure | undefined;
  private fromComponents: ActionsMap | undefined;
  private fromReucers: ActionsMap | undefined;
  allActions: string[];

  constructor(
    srcDir: string,
    outputDir: string,
    structureFile: string,
    force: boolean,
  ) {
    this.srcDir = srcDir;
    this.outputDir = outputDir;
    this.force = force;
    this.structureFile = join(this.outputDir, structureFile);
    const content = this.readStructure();
    this.allActions = content?.allActions ?? this.getAllActions();
    this.fromComponents = content?.fromComponents;
    this.fromEffects = content?.fromEffects;
    this.fromReucers = content?.fromReducers;
  }

  getParentNodes(node: Node, identifiers: string[]): Node[] {
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
    const allActions = glob
    .sync(join(this.srcDir, '**/*.actions.ts'))
    .reduce((result: string[], filename: string) => {
      const actionPerFile = this.getParentNodes(readSourceFile(filename), [
        'createAction',
      ]).map(node =>
        (
            (node.parent as VariableDeclaration).name as Identifier
        ).escapedText.toString(),
      );
      return [...result, ...actionPerFile];
    }, []);
    return allActions;
  }

  reducerActions(reducer: Node): string[] {
    return this.getParentNodes(reducer, ['on']).flatMap(node =>
      (
        (node as CallExpression).arguments[0] as Identifier
      ).escapedText.toString(),
    );
  }

  reducerActionsMap(sourceFile: Node): ActionsMap {
    // one reducer per file
    const reducer = this.getParentNodes(sourceFile, ['createReducer'])[0];
    const reducerName = (
      (reducer.parent as VariableDeclaration).name as Identifier
    ).escapedText.toString();
    return { [reducerName]: this.reducerActions(reducer) };
  }

  mapReducersToActions(): ActionsMap {
    if (!this.force && this.fromReucers !== undefined) {
      return this.fromReucers;
    }

    const reducerActionsMap = glob
    .sync(join(this.srcDir, '**/*.reducer.ts'))
    .reduce((result, filename) => {
      return {
        ...result,
        ...this.reducerActionsMap(readSourceFile(filename)),
      };
    }, {});
    return reducerActionsMap;
  }

  effectTriggeringActions(effect: Node): string[] {
    return this.getParentNodes(effect, ['ofType']).flatMap(node =>
      (node as CallExpression).arguments.map(arg =>
        (arg as Identifier).escapedText.toString(),
      ),
    );
  }

  effectDispatchedActions(
    effect: Node,
    sourceFile: SourceFile,
    input: string[],
  ): string[] {
    const mapNodes = this.getParentNodes(effect, [
      'map',
      'switchMap',
      'concatMap',
      'exhoustMap',
      'mergeMap',
    ]);
    let actions: string[] = [];
    for (const mapNode of mapNodes.filter(
      node => node.kind === SyntaxKind.CallExpression,
    )) {
      actions = [
        ...actions,
        ...this.allActions.filter((action: string) =>
          // eslint-disable-next-line no-useless-escape
          mapNode.getText().match(new RegExp(`[^\w]${action}\\(`)),
        ),
      ];
      forEachChild((mapNode as CallExpression).arguments[0], (node: Node) => {
        if (
          node.kind === SyntaxKind.CallExpression &&
          ((node as CallExpression).expression as PropertyAccessExpression).name
        ) {
          const privateMethodName = (
            (node as CallExpression).expression as PropertyAccessExpression
          ).name.escapedText.toString();
          const callables = this.getParentNodes(sourceFile, [
            privateMethodName,
          ]);
          for (const callable of callables) {
            if (callable.kind === SyntaxKind.PropertyDeclaration) {
              actions = [
                ...actions,
                ...this.allActions.filter((action: string) =>
                  // eslint-disable-next-line no-useless-escape
                  callable.getText().match(new RegExp(`[^\w]${action}\\(`)),
                ),
              ];
            }
          }
        }
      });
    }

    return [...new Set(actions.filter(action => !input.includes(action)))];
  }

  getEffectActionsMap(sourceFile: SourceFile): EffectsStructure {
    const effectBodies = this.getParentNodes(sourceFile, ['createEffect']);
    return effectBodies.reduce((sum, { parent: effect }) => {
      const key = (
        (effect as VariableDeclaration).name as Identifier
      ).escapedText.toString();
      const input = this.effectTriggeringActions(effect);
      const output = this.effectDispatchedActions(effect, sourceFile, input);
      return { ...sum, [key]: { input, output } };
    }, {});
  }

  mapeffectsToActions(): EffectsStructure {
    if (!this.force && this.fromEffects !== undefined) {
      console.log('Reading for a previously saved structure');
      return this.fromEffects;
    }

    const effectActionsMap = glob
    .sync(join(this.srcDir, '**/*.effects.ts'))
    .reduce((result, filename) => {
      return {
        ...result,
        ...this.getEffectActionsMap(readSourceFile(filename)),
      };
    }, {});
    return effectActionsMap;
  }

  getComponentDispatchedActions(sourceFile: SourceFile): ActionsMap {
    let className = '';
    forEachChild(sourceFile, node => {
      if (node.kind === SyntaxKind.ClassDeclaration) {
        className = (
          (node as ClassDeclaration).name as Identifier
        ).escapedText.toString();
      }
    });
    const nodes = this.getParentNodes(sourceFile, ['dispatch']).map(node =>
      node.parent.getText(),
    );
    const actions = [
      ...new Set(
        this.allActions.filter(
          (action: string) =>
            nodes.filter(node => node.includes(action)).length,
        ),
      ),
    ];
    return { [className]: actions };
  }

  mapComponentToActions(): ActionsMap {
    if (!this.force && this.fromComponents !== undefined) {
      return this.fromComponents;
    }

    let componentActionsMap = glob
    .sync(join(this.srcDir, '**/*.component.ts'))
    .reduce((result, filename) => {
      return {
        ...result,
        ...this.getComponentDispatchedActions(readSourceFile(filename)),
      };
    }, {});
    componentActionsMap = Object.fromEntries(
      Object.entries(componentActionsMap).filter(([, v]) => !isEmpty(v)),
    );
    return componentActionsMap;
  }

  readStructure():
    | {
        allActions: string[];
        fromComponents: ActionsMap;
        fromEffects: EffectsStructure;
        fromReducers: ActionsMap;
      }
    | undefined {
    this.structureSaved = fs.existsSync(this.structureFile);
    if (!this.structureSaved) {
      return;
    }

    return JSON.parse(fs.readFileSync(this.structureFile, 'utf-8'));
  }

  saveStructure(
    fromComponents: ActionsMap,
    fromEffects: { [key: string]: InputOutputMap },
    fromReducers: ActionsMap,
  ): void {
    if (
      !(
        this.force ||
        [this.fromComponents, this.fromEffects, this.fromReucers].length < 2
      )
    ) {
      console.log('Structure is already saved');
      return;
    }

    if (fs.existsSync(this.structureFile)) {
      fs.unlinkSync(this.structureFile);
    }

    const content = JSON.stringify({
      allActions: this.allActions,
      fromComponents,
      fromEffects,
      fromReducers,
    });
    fs.writeFileSync(this.structureFile, content);
  }

  generateActionGraph(
    action: string,
    fromComponents: ActionsMap,
    fromEffects: { [key: string]: InputOutputMap },
    fromReducers: ActionsMap,
  ): void {
    const dotFile = join(this.outputDir, `${action}.dot`);
    if (fs.existsSync(dotFile)) {
      if (!this.force) {
        return;
      }

      fs.unlinkSync(dotFile);
    }

    const filterdByAction = [
      ...chainActionsByInput(fromEffects, action),
      ...chainActionsByOutput(fromEffects, action),
    ];
    let content = 'digraph {\n';
    for (const [k, v] of Object.entries(fromComponents)) {
      const lines = v.map(o => {
        if (
          filterdByAction.some(a => a.input.includes(o) || a.output.includes(o))
        ) {
          return `${k} [shape="box", color=blue, fillcolor=blue, fontcolor=white, style=filled]
          ${k} -> ${o}\n`;
        }

        return '';
      });
      content += lines.join('');
    }

    for (const [k, v] of Object.entries(fromReducers)) {
      const lines = v.map(o => {
        if (
          filterdByAction.some(a => a.input.includes(o) || a.output.includes(o))
        ) {
          return `${k} [shape="hexagon", color=purple, fillcolor=purple, fontcolor=white, style=filled]
              ${o} -> ${k}\n`;
        }

        return '';
      });
      content += lines.join('');
    }

    for (const v of filterdByAction) {
      const lines = v.output.map(o => `${v.input} -> ${o}\n`);
      content += lines.join('');
    }

    content += '}\n';
    fs.writeFileSync(dotFile, content);
  }

  generateAllGraph(
    fromComponents: ActionsMap,
    fromEffects: { [key: string]: InputOutputMap },
    fromReducers: ActionsMap,
  ): void {
    const dotFile = join(this.outputDir, 'all.dot');
    if (fs.existsSync(dotFile)) {
      fs.unlinkSync(dotFile);
    }

    let content = 'digraph {\n';
    for (const [k, v] of Object.entries(fromComponents)) {
      const lines = v.map(
        o => `${k} [shape="box", color=blue, fillcolor=blue, fontcolor=white, style=filled]
      ${k} -> ${o}\n`,
      );
      content += lines.join('');
    }

    for (const v of Object.values(fromEffects)) {
      const lines = v.output.map(o => `${v.input} -> ${o}\n`);
      content += lines.join('');
    }

    for (const [k, v] of Object.entries(fromReducers)) {
      const lines = v.map(
        o => `${k} [shape="hexagon", color=purple, fillcolor=purple, fontcolor=white, style=filled]
              ${o} -> ${k}\n`,
      );
      content += lines.join('');
    }

    content += '}\n';
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
  fromEffects: EffectsStructure,
  action: string,
): InputOutputMap[] {
  try {
    return Object.values(fromEffects).reduce(
      (result: InputOutputMap[], v: InputOutputMap) => {
        if (v.input.includes(action)) {
          const chainedPerEffect = v.output.flatMap(obj =>
            chainActionsByInput(fromEffects, obj),
          );
          return uniq([...result, v, ...chainedPerEffect]);
        }

        return result;
      },
      [],
    );
  } catch {
    return [];
  }
}

export function chainActionsByOutput(
  fromEffects: EffectsStructure,
  action: string,
): InputOutputMap[] {
  try {
    return Object.values(fromEffects).reduce(
      (result: InputOutputMap[], v: InputOutputMap) => {
        if (v.output.includes(action)) {
          const chainedPerEffect = v.input.flatMap(obj =>
            chainActionsByOutput(fromEffects, obj),
          );
          return uniq([...result, v, ...chainedPerEffect]);
        }

        return result;
      },
      [],
    );
  } catch {
    return [];
  }
}
