import { Command, Flags } from '@oclif/core';
import { spawnSync } from 'child_process';
import path from 'path';

export default class Graph extends Command {
  async run(): Promise<void> {
    const argv = process.argv.slice(2);
    const hasHelp = argv.includes('--help') || argv.includes('-h');
    const hasCommand = argv.some(a => !a.startsWith('-'));
    const node = process.execPath || 'node';
    const cliPath = path.join(process.cwd(), 'src', 'cli.ts');
    if (hasHelp && !hasCommand) {
      const res = spawnSync(node, ['-r', 'ts-node/register', cliPath, '--help'], {stdio: 'inherit'});
      process.exit(res.status ?? 0);
    }
    const res = spawnSync(node, ['-r', 'ts-node/register', cliPath, ...argv], {stdio: 'inherit'});
    process.exit(res.status ?? 0);
  }
}

Graph.description = 'Generate NgRx actions graph';
Graph.examples = [
  '$ ngrx-graph --dir ./src --out ngrx-graph.json',
  '$ ngrx-graph loadUser --dir ./src --svg',
  '$ ngrx-graph --all --dir ./src --svg'
];

Graph.usage = '[ACTION]';

Graph.flags = {
  dir: Flags.string({char: 'd', description: 'Directory to scan', default: process.cwd()}),
  out: Flags.string({char: 'o', description: 'output JSON file name (placed in --dir)', default: 'ngrx-graph.json'}),
  verbose: Flags.boolean({char: 'v', description: 'enable verbose logging', default: false}),
  concurrency: Flags.integer({char: 'c', description: 'concurrency for file parsing', default: 8}),
  svg: Flags.boolean({char: 's', description: 'also generate SVG files from DOT (requires Graphviz `dot` on PATH)', default: false}),
  all: Flags.boolean({char: 'a', description: 'only generate the aggregated all.dot (no per-action files)', default: false}),
  force: Flags.boolean({char: 'f', description: 'scan and write ngrx-graph.json only (no DOT/SVG)', default: false}),
};
export { };

