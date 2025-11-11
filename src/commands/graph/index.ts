import { Command, Flags } from '@oclif/core';
import { DEFAULTS } from '../../config/defaults';
import { findSourceFiles } from '../../discovery/file-scanner';
import { parseFiles } from '../../discovery/parser';
import { writeDot } from '../../generate/dot-writer';
import { buildGraph } from '../../graph/graph-builder';
import { extractSubgraph } from '../../graph/subgraph';
import { readStructure, writeStructure } from '../../serialize/cache';
import { error, info } from '../../utils/log';

export default class GraphCommand extends Command {
  static description = 'Generate NgRx actions graph';

  static flags = {
    all: Flags.boolean({ char: 'a' }),
    jsonOnly: Flags.boolean({ char: 'j' }),
    force: Flags.boolean({ char: 'f' }),
    outputDir: Flags.string({ char: 'o', default: DEFAULTS.outputDir }),
    srcDir: Flags.string({ char: 'd', default: DEFAULTS.srcDir }),
    structureFile: Flags.string({ char: 's', default: DEFAULTS.structureFile }),
  };

  // loosened typing for oclif args to satisfy TypeScript in this scaffold
  // do not declare static args to avoid type mismatch with oclif Command static side in this scaffold

  public async run(): Promise<void> {
  // parse with oclif using the defined command class; provide explicit flag typing to avoid any
  type GraphFlags = {
    all?: boolean;
    jsonOnly?: boolean;
    force?: boolean;
    outputDir?: string;
    srcDir?: string;
    structureFile?: string;
  };
  const { flags: rawFlags } = await this.parse(GraphCommand);
  const flags = rawFlags as GraphFlags;
  // extract action from argv (positional arg) if provided
  const action = this.argv && this.argv.length > 0 ? String(this.argv[0]) : undefined;
  const out = String((flags.outputDir as string) || DEFAULTS.outputDir);
  const structureFile = String((flags.structureFile as string) || DEFAULTS.structureFile);

    let struct = null;
    if (!flags.force) {
      struct = readStructure(out, structureFile);
      if (struct) info('Using cached structure', `${out}/${structureFile}`);
    }

    if (!struct) {
      info('Scanning source files...');
  const srcDir = String((flags.srcDir as string) || DEFAULTS.srcDir);
  const files = await findSourceFiles(srcDir);
      const parsed = parseFiles(files);
      const built = buildGraph(parsed.nodes, parsed.edges);
      struct = { ...built, generatedAt: new Date().toISOString(), version: '0.0.0' };
      const written = writeStructure(struct, out, structureFile);
      info('Wrote structure', written);
    }

    if (flags.jsonOnly) {
      info('jsonOnly specified, done.');
      return;
    }

    if (action) {
      try {
        const sub = extractSubgraph(struct, action);
        const dotPath = `${out}/${action}.dot`;
        writeDot(sub, dotPath);
        info('Wrote dot for action', dotPath);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        error(msg);
        this.exit(2);
      }
      return;
    }

    // default: write full graph
    const dotPath = `${out}/full.dot`;
    writeDot(struct, dotPath);
    info('Wrote full dot file', dotPath);
  }
}
