import { Command, Flags, CliUx } from "@oclif/core";
import {
  chainActionsByInput,
  chainActionsByOutput,
  Generator,
} from "../../generator";

export default class Graph extends Command {
  static description = "Generate NgRx actions graph";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static flags = {
    all: Flags.boolean({ char: "a" }),
    srcDir: Flags.string({ char: "d" }),
    outputFile: Flags.string({ char: "o" }),
  };

  static args = [
    { name: "action", description: "Action of interest", required: false },
  ];

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Graph);
    const { all, srcDir, outputFile } = flags;
    const { action } = args;

    CliUx.ux.action.start("Collecting all actions");
    const gen = new Generator(
      srcDir ?? process.cwd(),
      outputFile ?? "/tmp/out"
    );
    CliUx.ux.action.stop();

    CliUx.ux.action.start("Collecting actions from components");
    const fromComponents = gen.mapComponentToActions();
    CliUx.ux.action.stop();

    CliUx.ux.action.start("Collecting actions from effects");
    const fromEffects = gen.mapeffectsToActions();
    CliUx.ux.action.stop();

    CliUx.ux.action.start("Collecting actions from reducers");
    const fromReducers = gen.mapReducersToActions();
    CliUx.ux.action.stop();

    let filterdByAction = Object.values(fromEffects);
    if (action) {
      CliUx.ux.action.start(`Building a chain of actions for ${action} `);
      filterdByAction = [
        ...chainActionsByInput(fromEffects, action),
        ...chainActionsByOutput(fromEffects, action),
      ];
      CliUx.ux.action.stop();
    }

    if (all) {
      gen.allActions.forEach(_action => {
        filterdByAction = [
          ...chainActionsByInput(fromEffects, _action),
          ...chainActionsByOutput(fromEffects, _action),
        ];
        CliUx.ux.action.start(`* ${_action}`);
        gen.generateGraph(fromComponents, filterdByAction, fromReducers);
        CliUx.ux.action.stop();
      });
    } else {
      CliUx.ux.action.start("Generating the graph");
      gen.generateGraph(fromComponents, filterdByAction, fromReducers);
      CliUx.ux.action.stop();
    }
  }
}
