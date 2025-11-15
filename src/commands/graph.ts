import { Command, Flags } from '@oclif/core';
import { spawnSync } from 'child_process';
import os from 'os';
import path from 'path';

export default class Graph extends Command {
  static id = 'ngrx-graph';
  async run(): Promise<void> {
    let rawArgv = process.argv.slice(2);
    if (rawArgv.length && rawArgv[0] === 'graph') rawArgv = rawArgv.slice(1);
    const argv = rawArgv;
    const hasHelp = argv.includes('--help') || argv.includes('-h');
    const hasCommand = argv.some(a => !a.startsWith('-'));
    const node = process.execPath || 'node';
    const cliPath = path.join(process.cwd(), 'src', 'cli.ts');
    if (hasHelp && !hasCommand) {
      const res = spawnSync(node, ['-r', 'ts-node/register', cliPath, '--help'], { stdio: 'inherit' });
      process.exit(res.status ?? 0);
    }
    const res = spawnSync(node, ['-r', 'ts-node/register', cliPath, ...argv], { stdio: 'inherit' });
    process.exit(res.status ?? 0);
  }
}

// Give the command a stable id so oclif does not emit the synthetic Symbol id
Graph.description = 'Generate NgRx actions graph';
/* SYNCHRONIZED_HELP_START */
Graph.examples = [
  '$ ngrx-graph -d ./src --out ./out',
  '$ ngrx-graph -d ./src --out ./out --all --svg',
  '$ ngrx-graph "MyAction" -d ./src --out ./out --svg',
  '$ ngrx-graph -d ./src --out ./out --json',
  '$ ngrx-graph -d ./src --out ./out',
  '$ ngrx-graph -d ./src --out ./out --dot',
  '$ ngrx-graph -d ./src --out ./out --svg'
];

Graph.description += `

Examples:


  # Scan a project and write JSON into the output directory (file: ngrx-graph.json)
  $ ngrx-graph -d ./src --out ./out

  # Generate aggregated DOT and SVG (all.dot / all.svg) under the output directory
  $ ngrx-graph -d ./src --out ./out --all --svg

  # Generate focused DOT/SVG for a specific action (positional argument)
  $ ngrx-graph "MyAction" -d ./src --out ./out --svg

  # Re-generate JSON and stop (writes ./out/ngrx-graph.json)
  $ ngrx-graph -d ./src --out ./out --json

  # Reuse an existing JSON payload instead of re-scanning
  $ ngrx-graph -d ./src --out ./out

  # Generate DOT files only (per-action and aggregated)
  $ ngrx-graph -d ./src --out ./out --dot

  # Generate SVGs (implies DOT generation)
  $ ngrx-graph -d ./src --out ./out --svg

Notes:

  - The CLI always writes the JSON payload to a file named 'ngrx-graph.json' inside the directory specified by '--out' (defaults to the scan directory).
  - DOT and SVG files are written under the directory specified by '--dir' (scan directory) unless you prefer to write them under '--out'.
  - Use '--json' to re-generate the JSON and stop (no DOT/SVG) when used alone.
  - Note: caching is enabled by default. To force a re-scan and regenerate the JSON payload, pass -f or --force.`;
/* SYNCHRONIZED_HELP_END */

Graph.usage = '[ACTION]';

Graph.flags = {
  dir: Flags.string({ char: 'd', description: 'Directory to scan', default: process.cwd() }),
  out: Flags.string({ char: 'o', description: "output JSON file name (placed in --dir)", default: 'ngrx-graph.json' }),
  verbose: Flags.boolean({ char: 'v', description: 'enable verbose logging', default: false }),
  concurrency: Flags.integer({
    char: 'c',
    description: 'concurrency for file parsing',
    default: Math.max(1, (os.cpus() || []).length - 2),
  }),
  svg: Flags.boolean({
    char: 's',
    description: 'also generate SVG files from DOT (requires Graphviz `dot` on PATH)',
    default: false,
  }),
  dot: Flags.boolean({
    description: 'also generate DOT files (per-action and aggregated)',
    default: false,
  }),
  viz: Flags.boolean({
    description: 'prefer viz.js for SVG generation (useful when dot is unavailable)',
    default: false,
  }),
  all: Flags.boolean({
    char: 'a',
    description: 'only generate the aggregated all.dot (no per-action files)',
    default: false,
  }),
  json: Flags.boolean({ char: 'j', description: 'scan and write ngrx-graph.json only (no DOT/SVG)', default: false }),
  force: Flags.boolean({ char: 'f', description: 'regenerate JSON payload and ignore any cached ngrx-graph.json (forces a re-scan)', default: false }),
};
export { };

