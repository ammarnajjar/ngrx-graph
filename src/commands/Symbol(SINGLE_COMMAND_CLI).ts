import { Command, Flags } from '@oclif/core';
import { spawnSync } from 'child_process';
import path from 'path';

export default class Graph extends Command {
  async run(): Promise<void> {
    // process.argv here is the original CLI args. Oclif normally expects a
    // subcommand token (e.g. `graph`), but we want to accept the single-command
    // invocation style used by the TypeScript CLI. To make oclif route here
    // whether the user invoked `./bin/dev graph ...` or `./bin/dev ...`, we
    // normalize argv so the shim always receives the CLI-style args when
    // delegating to `src/cli.ts`.
    let rawArgv = process.argv.slice(2);
    // If the first token is 'graph', strip it (user called `bin/dev graph ...`).
    if (rawArgv.length && rawArgv[0] === 'graph') rawArgv = rawArgv.slice(1);
    // If oclif parsed flags and treated them as command tokens, ensure we
    // still forward the full original intended args to the TypeScript CLI.
    // We'll reconstruct `argv` from the raw argv after normalization.
    const argv = rawArgv;
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
/* SYNCHRONIZED_HELP_START */
Graph.examples = [
  '$ ngrx-graph -d ./src --out ./out',
  '$ ngrx-graph -d ./src --out ./out --all --svg',
  '$ ngrx-graph "MyAction" -d ./src --out ./out --svg',
  '$ ngrx-graph -d ./src --out ./out --force'
];

Graph.description += `

Examples:


  # Scan a project and write JSON into the output directory (file: ngrx-graph.json)
  $ ngrx-graph -d ./src --out ./out

  # Generate aggregated DOT and SVG (all.dot / all.svg) under the output directory
  $ ngrx-graph -d ./src --out ./out --all --svg

  # Generate focused DOT/SVG for a specific action (positional argument)
  $ ngrx-graph "MyAction" -d ./src --out ./out --svg

  # Force re-generate JSON and stop (writes ./out/ngrx-graph.json)
  $ ngrx-graph -d ./src --out ./out --force

Notes:

  - The CLI always writes the JSON payload to a file named 'ngrx-graph.json' inside the directory specified by '--out' (defaults to the scan directory).
  - DOT and SVG files are written under the directory specified by '--dir' (scan directory) unless you prefer to write them under '--out'.
  - Use '--force' to re-generate the JSON first; combine it with other flags to continue generating DOT/SVG.`;
/* SYNCHRONIZED_HELP_END */


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

