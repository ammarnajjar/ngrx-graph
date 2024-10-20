// https://ts-ast-viewer.com

/* eslint-disable @typescript-eslint/no-explicit-any */
import { isEmpty } from 'lodash';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CallExpression,
  ClassDeclaration,
  Identifier,
  Node,
  PropertyAccessExpression,
  PropertySignature,
  SourceFile,
  SyntaxKind,
  TypeLiteralNode,
  VariableDeclaration,
  forEachChild,
} from 'typescript';

import { actionRegex, actionToReplace } from './action-regex';
import { chainActionsByInput, chainActionsByOutput } from './chain-actions';
import { deleteFile } from './delete-file';
import {
  actionFiles,
  componentsFiles,
  effectsFiles,
  reducerFiles,
} from './glob-files';
import {
  componentStyle,
  graphHeader,
  graphTail,
  loadedActionStyle,
  nestedActionStyle,
  reducerStyle,
  selectedActionStyle,
} from './graph-styles';
import {
  ActionsMap,
  EffectsStructure,
  InputOutputMap,
  LoadedAction,
  TypedAction,
} from './models';
import { getChildNodesRecursivly, getParentNodes } from './nodes';
import { readSourceFile } from './read-source-file';

export class Generator {
  allActions: TypedAction[] = [];
  loadedActions: LoadedAction[] = [];
  nestedActions: string[] = [];
  private force = false;
  private fromComponents: ActionsMap | undefined;
  private fromEffects: EffectsStructure | undefined;
  private fromReucers: ActionsMap | undefined;
  private outputDir = '';
  private srcDir = '';
  private structureFile = '';
  private structureSaved = false;

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
    const content = force ? undefined : this.readStructure();
    this.allActions = content?.allActions ?? this.getAllActions();
    this.nestedActions = this.allActions
      .filter(action => action.nested)
      .map(action => action.name);
    this.fromComponents = content?.fromComponents;
    this.fromEffects = content?.fromEffects;
    this.fromReucers = content?.fromReducers;
    this.loadedActions = content?.loadedActions ?? [];
  }

  generateActionGraph(
    action: string,
    fromComponents: ActionsMap,
    fromEffects: { [key: string]: InputOutputMap },
    fromReducers: ActionsMap,
  ): void {
    const dotFile = join(this.outputDir, `${action}.dot`);
    deleteFile(dotFile);

    const filterdByAction = [
      ...chainActionsByInput(fromEffects, action),
      ...chainActionsByOutput(fromEffects, action),
    ];

    let content = graphHeader;
    for (const [k, v] of Object.entries(fromComponents)) {
      const lines = v.map(componentAction => {
        if (
          filterdByAction.some(effect =>
            effect.input.includes(componentAction),
          ) ||
          action === componentAction
        ) {
          return `${k} ${componentStyle}\n${k} -> ${componentAction}\n`;
        }

        return '';
      });
      content += lines.join('');
    }

    for (const v of filterdByAction) {
      const lines = v.output.map(o => `${v.input} -> ${o}\n`);
      content += lines.join('');
    }

    const filterdLoadedActions = this.loadedActions.filter(a =>
      [a.name, ...a.payloadActions].some(_action =>
        filterdByAction
          .flatMap(b => [...b.input, ...b.output])
          .includes(_action),
      ),
    );
    const lines = filterdLoadedActions.map(a => {
      const style = a.payloadActions.includes(action)
        ? selectedActionStyle
        : loadedActionStyle;
      return `${a.payloadActions} ${style}\n${a.name} -> ${a.payloadActions} [arrowhead=dot]\n`;
    });
    content += lines.join('');

    for (const [k, v] of Object.entries(fromReducers)) {
      const lines = v.map(reducerAction => {
        if (
          filterdByAction.some(effect =>
            effect.output.includes(reducerAction),
          ) ||
          action === reducerAction
        ) {
          return `${k} ${reducerStyle}\n${reducerAction} -> ${k}\n`;
        }

        return '';
      });
      content += lines.join('');
    }

    content += graphTail;
    content = content.replace(
      actionToReplace(action),
      `${action} ${selectedActionStyle}\n$1`,
    );
    for (const action of this.nestedActions) {
      content = content.replace(
        actionToReplace(action),
        `${action} ${nestedActionStyle}\n$1`,
      );
    }

    writeFileSync(dotFile, content);
  }

  generateAllGraph(
    fromComponents: ActionsMap,
    fromEffects: { [key: string]: InputOutputMap },
    fromReducers: ActionsMap,
  ): void {
    const dotFile = join(this.outputDir, 'all.dot');
    deleteFile(dotFile);

    let content = graphHeader;
    for (const [k, v] of Object.entries(fromComponents)) {
      const lines = v.map(o => `${k} ${componentStyle}\n${k} -> ${o}\n`);
      content += lines.join('');
    }

    for (const v of Object.values(fromEffects)) {
      const lines = v.output.map(o => `${v.input} -> ${o}\n`);
      content += lines.join('');
    }

    const lines = this.loadedActions.map(
      a =>
        `${a.payloadActions} [fillcolor=linen, style=filled]\n${a.name} -> ${a.payloadActions} [arrowhead=dot]\n`,
    );
    content += lines.join('');

    for (const [k, v] of Object.entries(fromReducers)) {
      const lines = v.map(o => `${k} ${reducerStyle}\n${o} -> ${k}\n`);
      content += lines.join('');
    }

    content += graphTail;
    writeFileSync(dotFile, content);
  }

  mapComponentToActions(): Promise<ActionsMap> {
    if (!this.force && !isEmpty(this.fromComponents)) {
      return new Promise((res) => res(this.fromComponents!));
    }
    const componentActionsMap = componentsFiles(this.srcDir).then(filenames =>
      filenames.reduce((result, filename) => {
        return {
          ...result,
          ...this.getComponentDispatchedActions(readSourceFile(filename)),
        };
      }, {}),
    );
    return componentActionsMap;
  }

  mapeffectsToActions(): Promise<EffectsStructure> {
    if (!this.force && !isEmpty(this.fromEffects)) {
      console.log('Reading for a previously saved structure');
      return new Promise((res) => res(this.fromEffects!));
    }
    const effectActionsMap = effectsFiles(this.srcDir).then(filenames => {
      return filenames.reduce((result, filename) => {
        return {
          ...result,
          ...this.getEffectActionsMap(readSourceFile(filename)),
        };
      }, {});
    });
    return effectActionsMap;
  }

  mapReducersToActions(): Promise<ActionsMap> {
    if (!this.force && !isEmpty(this.fromReucers)) {
      return new Promise((res) => res(this.fromReucers!));
    }
    const reducerActionsMap = reducerFiles(this.srcDir).then(filenames => {
      return filenames.reduce((result, filename) => {
        return {
          ...result,
          ...this.reducerActionsMap(readSourceFile(filename)),
        };
      }, {});
    });
    return reducerActionsMap;
  }

  readStructure():
    | {
        allActions: TypedAction[];
        fromComponents: ActionsMap;
        fromEffects: EffectsStructure;
        fromReducers: ActionsMap;
        loadedActions: LoadedAction[];
      }
    | undefined {
    this.structureSaved = existsSync(this.structureFile);
    if (!this.structureSaved) {
      return;
    }

    return JSON.parse(readFileSync(this.structureFile, 'utf-8'));
  }

  saveStructure(
    fromComponents: ActionsMap,
    fromEffects: { [key: string]: InputOutputMap },
    fromReducers: ActionsMap,
  ): void {
    if (
      !this.force &&
      this.fromComponents &&
      this.fromEffects &&
      this.fromReucers
    ) {
      console.log('Structure is already saved');
      return;
    }

    deleteFile(this.structureFile);

    const content = JSON.stringify({
      allActions: this.allActions,
      fromComponents,
      fromEffects,
      fromReducers,
      loadedActions: this.loadedActions,
    });
    writeFileSync(this.structureFile, content);
  }

  private effectDispatchedActions(
    effect: Node,
    sourceFile: SourceFile,
    input: string[],
  ): string[] {
    const mapNodes = getParentNodes(effect, [
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
      const mapText = mapNode.getText();
      actions = [
        ...actions,
        ...this.allActions
          .filter((action: TypedAction) =>
            mapText.match(actionRegex(action.name)),
          )
          .map(action => action.name),
      ];
    }

    actions = this.updateLoadedActions(actions, sourceFile, effect);
    return [...new Set(actions.filter(action => !input.includes(action)))];
  }

  private effectTriggeringActions(effect: Node): string[] {
    return getParentNodes(effect, ['ofType']).flatMap(node =>
      (node as CallExpression).arguments.map(arg =>
        (arg as Identifier).escapedText.toString(),
      ),
    );
  }

  private getActionsFromPrivateMethod(
    sourceFile: SourceFile,
    privateMethodName: string,
  ): string[] {
    let actions: string[] = [];
    const callables = getParentNodes(sourceFile, [privateMethodName]);
    for (const callable of callables) {
      if (callable.kind === SyntaxKind.MethodDeclaration) {
        actions = [
          ...actions,
          ...this.allActions
            .filter((action: TypedAction) =>
              callable.getText().match(actionRegex(action.name)),
            )
            .map(action => action.name),
        ];
      }
    }

    return actions;
  }

  private getAllActions(): TypedAction[] {
    const allActions = actionFiles(this.srcDir).reduce(
      (result: TypedAction[], filename: string) => {
        const actionsPerFile: TypedAction[] = getParentNodes(
          readSourceFile(filename),
          ['createAction'],
        ).map(node => {
          const name = (
            (node.parent as VariableDeclaration).name as Identifier
          ).escapedText.toString();
          const members = (
            (
              (node as CallExpression).arguments[1] as
                | CallExpression
                | undefined
            )?.typeArguments![0] as TypeLiteralNode | undefined
          )?.members;
          const nested =
            (node as CallExpression).arguments.length > 1 &&
            members
              ?.map(member =>
                (
                  (member as PropertySignature).type as any
                ).typeName?.escapedText?.toString(),
              )
              .includes('Action') === true;

          const action = { name, nested };
          return action;
        });
        return [...result, ...actionsPerFile];
      },
      [],
    );
    return allActions;
  }

  private getComponentDispatchedActions(sourceFile: SourceFile): ActionsMap {
    let className = '';
    forEachChild(sourceFile, node => {
      if (node.kind === SyntaxKind.ClassDeclaration) {
        className = (
          (node as ClassDeclaration).name as Identifier
        ).escapedText.toString();
      }
    });
    const nodes = getParentNodes(sourceFile, ['dispatch']).map(node =>
      node.parent.getText(),
    );
    let actions = [
      ...new Set(
        this.allActions
          .filter(
            (action: TypedAction) =>
              nodes.filter(node => node.match(actionRegex(action.name))).length,
          )
          .map(action => action.name),
      ),
    ];
    actions = this.updateLoadedActions(actions, sourceFile);
    return Object.fromEntries(
      Object.entries({ [className]: actions }).filter(([, v]) => !isEmpty(v)),
    );
  }

  private getEffectActionsMap(sourceFile: SourceFile): EffectsStructure {
    const effectBodies = getParentNodes(sourceFile, ['createEffect']);
    return effectBodies.reduce((sum, { parent: effect }) => {
      const key = (
        (effect as VariableDeclaration).name as Identifier
      ).escapedText.toString();
      const input = this.effectTriggeringActions(effect);
      const output = this.effectDispatchedActions(effect, sourceFile, input);
      return { ...sum, [key]: { input, output } };
    }, {});
  }

  private reducerActions(reducer: Node): string[] {
    return getParentNodes(reducer, ['on']).flatMap(node =>
      (
        (node as CallExpression).arguments[0] as Identifier
      ).escapedText.toString(),
    );
  }

  private reducerActionsMap(sourceFile: Node): ActionsMap {
    // one reducer per file
    const reducer = getParentNodes(sourceFile, ['createReducer'])[0];
    const reducerName = (
      (reducer.parent as VariableDeclaration).name as Identifier
    ).escapedText.toString();
    return { [reducerName]: this.reducerActions(reducer) };
  }

  private updateLoadedActions(
    actions: string[],
    sourceFile: SourceFile,
    parentNode?: Node,
  ): string[] {
    let result = [...actions];
    const nodeInUse = parentNode ?? sourceFile;
    for (const node of getChildNodesRecursivly(nodeInUse)) {
      if (
        // get triggered nested actions
        node.kind === SyntaxKind.CallExpression &&
        ((node as CallExpression).expression as Identifier | undefined) &&
        ((node as CallExpression).expression as Identifier | undefined)
          ?.escapedText &&
        this.nestedActions.includes(
          (
            (node as CallExpression).expression as Identifier
          ).escapedText.toString(),
        )
      ) {
        const actionName = (
          (node as CallExpression).expression as Identifier
        ).escapedText.toString();
        const nodeText = node.getText();
        const payloadActions = this.allActions
          .filter((action: TypedAction) =>
            nodeText.match(actionRegex(action.name)),
          )
          .map(action => action.name);
        if (!isEmpty(payloadActions)) {
          this.loadedActions = [
            ...this.loadedActions,
            { name: actionName, payloadActions },
          ];
        }

        for (const payloadAction of payloadActions) {
          if (
            nodeInUse.getText().match(actionRegex(payloadAction, 'g'))
              ?.length === 1
          ) {
            result = result.filter(action => !payloadActions.includes(action));
          }
        }
      }

      if (
        node.kind === SyntaxKind.CallExpression &&
        ((node as CallExpression).expression as PropertyAccessExpression).name
      ) {
        const privateMethodName = (
          (node as CallExpression).expression as PropertyAccessExpression
        ).name.escapedText.toString();
        const privateMethodActionsAsArguments = (
          (node as CallExpression).arguments as any
        )
          .filter(
            (arg: Node) =>
              arg.kind === SyntaxKind.Identifier &&
              this.allActions
                .map(_action => _action.name)
                .includes((arg as Identifier).escapedText.toString()),
          )
          .map((arg: Identifier) => arg.escapedText.toString());
        result = [
          ...result,
          ...privateMethodActionsAsArguments,
          ...this.getActionsFromPrivateMethod(sourceFile, privateMethodName),
        ];
      }
    }

    return result;
  }
}
