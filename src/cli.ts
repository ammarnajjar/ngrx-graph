#!/usr/bin/env node
// Load chalk in a way that works whether chalk is published as CJS or ESM-only.
// We prefer a synchronous require (works in CommonJS outputs). If that fails
// (ERR_REQUIRE_ESM), provide a small ANSI-color fallback implementing `.hex()`
// and `.red()` used by the CLI.
let chalk: { hex?: (color: string) => (msg: string) => string; red?: (m: string) => string; default?: { hex?: (color: string) => (msg: string) => string; red?: (m: string) => string } };
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  chalk = require('chalk');
  // support cases where require returns a module object with `.default`
  if (chalk && typeof chalk.red !== 'function' && chalk.default) {
    chalk = chalk.default;
  }
} catch {
  const parseHex = (h: string) => {
    if (!h) return '255;255;255';
    if (h.startsWith('#')) h = h.slice(1);
    const r = parseInt(h.slice(0, 2), 16) || 255;
    const g = parseInt(h.slice(2, 4), 16) || 255;
    const b = parseInt(h.slice(4, 6), 16) || 255;
    return `${r};${g};${b}`;
  };
  chalk = {
    hex: (color: string) => (msg: string) => `\u001b[38;2;${parseHex(color)}m${msg}\u001b[0m`,
    red: (m: string) => `\u001b[31m${m}\u001b[0m`,
    default: { hex: (color: string) => (msg: string) => `\u001b[38;2;${parseHex(color)}m${msg}\u001b[0m` },
  };
}
import { Command } from 'commander';
import os from 'os';
import path from 'path';
import cleanDotFilesIfNotRequested from './cli/cleanup';
import { generatePayloadIfNeeded, processDotSvgGeneration } from './cli/helpers';

const program = new Command();

function chalkHex(color: string) {
  return (msg: string) => (chalk && typeof chalk.hex === 'function' ? chalk.hex(color)(msg) : msg);
}

function chalkRed(msg: string) {
  return chalk && typeof chalk.red === 'function' ? chalk.red(msg) : msg;
}

function getDefaultConcurrency(): number {
  try {
    return Math.max(1, os.cpus().length - 2);
  } catch {
    return 1;
  }
}

program
  .name('ngrx-graph')
  .description('Scan a project for NgRx actions declarations')
  .option('-d, --dir <dir>', 'Directory to scan', process.cwd())
  .option('-o, --out [dir]', "output directory where 'ngrx-graph.json' will be written (defaults to scan dir)")
  .option('-v, --verbose', 'enable verbose logging', false)
  .option('-c, --concurrency <n>', 'concurrency for file parsing', String(getDefaultConcurrency()))
  .option('-s, --svg', 'also generate SVG files from DOT (requires Graphviz `dot` on PATH)', false)
  .option('--viz', 'prefer viz.js for SVG generation (useful when dot is unavailable)', false)
  .option('-a, --all', 'only generate the aggregated all.dot (no per-action files)', false)
  .option('--dot', 'also generate DOT files (per-action and aggregated)', false)
  .option('-j, --json', 'scan and write ngrx-graph.json only (no DOT/SVG)', false)
  .option('-f, --force', 'regenerate JSON payload and ignore any cached ngrx-graph.json (forces a re-scan)', false)
  .argument('[action]', 'action name to focus (positional; overrides --action and --all)')
  .addHelpText(
    'after',
    `

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
  - Note: caching is enabled by default. To force a re-scan and regenerate the JSON payload, pass -f or --force.
`,
  )
  .parse(process.argv);
const opts = program.opts();
const useCache = !opts.force;
const positionalAction = program.args && program.args.length ? program.args[0] : undefined;
if (positionalAction) {
  opts.action = positionalAction;
  opts.all = false;
  if (!opts.svg) opts.svg = true;
}

async function run() {
  const dir = path.resolve(opts.dir);
  function defaultConcurrency() {
    try {
      return Math.max(1, os.cpus().length - 2);
    } catch {
      return 1;
    }
  }
  const parsed = parseInt(opts.concurrency, 10);
  const concurrency = Math.max(1, Number.isFinite(parsed) && parsed > 0 ? parsed : defaultConcurrency());
  const pattern = '**/*actions.ts';

  const outDir = opts.out
    ? path.isAbsolute(opts.out)
      ? path.resolve(opts.out)
      : path.resolve(process.cwd(), opts.out)
    : dir;
  const outFile = path.join(outDir, 'ngrx-graph.json');

  const startTime = Date.now();
  await generatePayloadIfNeeded({
    useCache,
    outFile,
    outDir,
    dir,
    concurrency,
    pattern,
    startTime,
    verbose: opts.verbose,
  });

  const hasGenerationFlags = !!(opts.action || opts.all || opts.svg);
  const dotExplicit = Boolean(opts.dot);
  const svgRequested = Boolean(opts.svg);
  const dotRequested = dotExplicit || svgRequested;
  if (opts.json && !hasGenerationFlags) {
    const totalDuration = (Date.now() - startTime) / 1000;
    console.log(chalkHex('#4DA6FF')(`Total elapsed time: ${totalDuration.toFixed(2)}s`));
    return;
  }

  const dotOut = outDir || dir;
  if (opts.verbose) {
    console.log(chalkHex('#4DA6FF')(`Resolved scan dir: ${dir}`));
    console.log(chalkHex('#4DA6FF')(`Resolved output dir: ${dotOut}`));
  }
  await cleanDotFilesIfNotRequested(dotOut, dotExplicit, opts.verbose);
  if (dotOut !== dir) {
    await cleanDotFilesIfNotRequested(dir, dotExplicit, opts.verbose);
  }
  if (dotOut && dotRequested) {
    await processDotSvgGeneration({ opts, outFile, dotOut, dotExplicit, verbose: opts.verbose });
  }
  const totalDuration = (Date.now() - startTime) / 1000;
  console.log(chalkHex('#4DA6FF')(`Total elapsed time: ${totalDuration.toFixed(2)}s`));
  return;
}

run().catch(err => {
  console.error(chalkRed('Error while scanning:'), err);
  process.exit(2);
});
