import { Command, Flags } from '@oclif/core';
import { runGraph } from '../cli';

export default class Graph extends Command {
  static description = 'Generate NgRx actions graph';

  static flags = {
    all: Flags.boolean({ char: 'a' }),
    jsonOnly: Flags.boolean({ char: 'j' }),
    force: Flags.boolean({ char: 'f' }),
    svg: Flags.boolean({ char: 'g', description: 'also emit SVG files using Graphviz dot' }),
    outputDir: Flags.string({ char: 'o' }),
    srcDir: Flags.string({ char: 'd' }),
    structureFile: Flags.string({ char: 's' }),
    highlightColor: Flags.string({ char: 'c' }),
    help: Flags.help({ char: 'h' }),
  };

  async run() {
    const parsed = await this.parse(Graph);
    const flags = parsed.flags || {};
    const args = parsed.args || {};
    const action = args.action as string | undefined;

    const options: {
      srcDir?: string;
      outputDir?: string;
      force?: boolean;
      jsonOnly?: boolean;
      all?: boolean;
      highlightColor?: string;
      svg?: boolean;
    } = {
      srcDir: flags.srcDir,
      outputDir: flags.outputDir,
      force: flags.force,
      jsonOnly: flags.jsonOnly,
      all: flags.all,
      highlightColor: flags.highlightColor,
      svg: flags.svg,
    };

    try {
      await runGraph(action, options);
    } catch (err) {
      // oclif expects us to throw or exit on failure
      this.error(String(err));
    }
  }
}

