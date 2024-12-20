import { Args, Command, Flags, ux } from '@oclif/core';
import { ArgInput } from '@oclif/core/lib/interfaces/parser';

import { Generator } from '../../generator/generator';

export default class Graph extends Command {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static args: ArgInput<{ [arg: string]: any }> = {
    action: Args.string({
      description:
        'Action of interest. It will be ignored if --jsonOnly is used',
      name: 'action',
      required: false,
    }),
  };

  static description = 'Generate NgRx actions graph';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {
    all: Flags.boolean({
      char: 'a',
      description:
        'Generate the whole graph for all actions and connected component, effects and reducers. It will be ignored if --jsonOnly is used',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Force regenrating the graph structure',
    }),
    jsonOnly: Flags.boolean({
      char: 'j',
      description:
        'Generate only the structure json file, can be combined with --structureFile option. It overrides --all and [ACTION]',
    }),
    outputDir: Flags.string({
      char: 'o',
      default: '/tmp',
      description: 'Destination directory, where to save the generated files',
    }),
    srcDir: Flags.string({
      char: 'd',
      description:
        '[default: current directory] Source directory to grab actions from, usually the directory with package.json in it',
    }),
    structureFile: Flags.string({
      char: 's',
      default: 'ngrx-graph.json',
      description:
        'Then name of the structure json file, Path is taken from --outputDir option',
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Graph);
    const { all, force, jsonOnly, outputDir, srcDir, structureFile } = flags;
    const { action } = args;

    ux.action.start('Collecting all actions');
    const gen = new Generator(
      srcDir || process.cwd(),
      outputDir,
      structureFile,
      force,
    );
    ux.action.stop();

    ux.action.start('Collecting actions from components');
    const fromComponents = await gen.mapComponentToActions();
    ux.action.stop();

    ux.action.start('Collecting actions from effects');
    const fromEffects = await gen.mapeffectsToActions();
    ux.action.stop();

    ux.action.start('Collecting actions from reducers');
    const fromReducers = await gen.mapReducersToActions();
    ux.action.stop();

    ux.action.start('Saving structure for later');
    gen.saveStructure(fromComponents, fromEffects, fromReducers);
    ux.action.stop();

    if (!jsonOnly) {
      if (action) {
        ux.action.start(` ⚡️ ${action} `);
        gen.generateActionGraph(
          action,
          fromComponents,
          fromEffects,
          fromReducers,
        );
        ux.action.stop();
      } else {
        for (const _action of gen.allActions.map(action => action.name)) {
          ux.action.start(` ⚡️ ${_action} `);
          gen.generateActionGraph(
            _action,
            fromComponents,
            fromEffects,
            fromReducers,
          );
          ux.action.stop();
        }
      }

      if (all) {
        ux.action.start('Generating the complete graph');
        gen.generateAllGraph(fromComponents, fromEffects, fromReducers);
        ux.action.stop();
      }
    }
  }
}
