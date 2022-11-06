import { Command, Flags, CliUx } from "@oclif/core";
import { forEach } from "lodash";
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
    outputDir: Flags.string({ char: "o" }),
  };

  static args = [
    { name: "action", description: "Action of interest", required: false },
  ];

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Graph);
    const { all, srcDir, outputDir: outputDir } = flags;
    const { action } = args;

    CliUx.ux.action.start("Collecting all actions");
    const gen = new Generator(srcDir ?? process.cwd(), outputDir ?? "~/tmp/");
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

    if (action) {
      CliUx.ux.action.start(` ⚡️ ${action} `);
      gen.generateActionGraph(
        action,
        fromComponents,
        fromEffects,
        fromReducers
      );
      CliUx.ux.action.stop();
    } else {
      gen.allActions.forEach(_action => {
        CliUx.ux.action.start(` ⚡️ ${_action} `);
        gen.generateActionGraph(
          _action,
          fromComponents,
          fromEffects,
          fromReducers
        );
        CliUx.ux.action.stop();
      });
    }

    if (all) {
      CliUx.ux.action.start("Generating the complete graph");
      gen.generateAllGraph(fromComponents, fromEffects, fromReducers);
      CliUx.ux.action.stop();
    }
  }
}
