#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import os from 'os';
import path from 'path';
import cleanDotFilesIfNotRequested from './cli/cleanup';
import { generatePayloadIfNeeded, processDotSvgGeneration } from './cli/helpers';

const program = new Command();

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
  .option('--cache', 'reuse existing ngrx-graph.json if present (skip scanning)', false)
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
  $ ngrx-graph -d ./src --out ./out --cache

  # Generate DOT files only (per-action and aggregated)
  $ ngrx-graph -d ./src --out ./out --dot

  # Generate SVGs (implies DOT generation)
  $ ngrx-graph -d ./src --out ./out --svg

Notes:

  - The CLI always writes the JSON payload to a file named 'ngrx-graph.json' inside the directory specified by '--out' (defaults to the scan directory).
  - DOT and SVG files are written under the directory specified by '--dir' (scan directory) unless you prefer to write them under '--out'.
  - Use '--json' to re-generate the JSON and stop (no DOT/SVG) when used alone; use '--cache' to reuse an existing JSON payload and skip scanning when present.
`,
  )
  .parse(process.argv);
const opts = program.opts();
// Normalize cache option: new default is no-cache; user can pass `--cache`
// to enable reuse of existing JSON payload.
const useCache = Boolean(opts.cache);
// allow positional action argument to override flag and --all
const positionalAction = program.args && program.args.length ? program.args[0] : undefined;
if (positionalAction) {
  opts.action = positionalAction;
  // when an action is provided, we should not run the aggregated `--all` behavior
  opts.all = false;
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

  // resolve output directory early so we can check for an existing JSON
  const outDir = opts.out
    ? path.isAbsolute(opts.out)
      ? path.resolve(opts.out)
      : path.resolve(process.cwd(), opts.out)
    : dir;
  const outFile = path.join(outDir, 'ngrx-graph.json');

  const startTime = Date.now();

  // SVG conversion helpers imported from ./cli/svg

  // JSON payload generation delegated to helpers

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

  // --json: always regenerate the JSON file first. If --json is used alone
  // (no other generation flags), stop after writing JSON. If combined with
  // other flags (positional action, --all, or --svg), continue to generate
  // DOT/SVG after regenerating the JSON.
  const hasGenerationFlags = !!(opts.action || opts.all || opts.svg);
  // DOT generation is opt-in via --dot; requesting SVG implies DOT generation.
  // Track whether the user explicitly requested DOT files so we can
  // remove temporary DOTs created solely for SVG generation when the
  // user did not ask for DOTs explicitly.
  const dotExplicit = Boolean(opts.dot);
  const svgRequested = Boolean(opts.svg);
  const dotRequested = dotExplicit || svgRequested;
  if (opts.json && !hasGenerationFlags) {
    const totalDuration = (Date.now() - startTime) / 1000;
    console.log(chalk.hex('#4DA6FF')(`Total elapsed time: ${totalDuration.toFixed(2)}s`));
    return;
  }

  const dotOut = outDir || dir;
  // verbose logging is enabled to avoid noisy output during normal runs.
  if (opts.verbose) {
    console.log(chalk.hex('#4DA6FF')(`Resolved scan dir: ${dir}`));
    console.log(chalk.hex('#4DA6FF')(`Resolved output dir: ${dotOut}`));
  }
  // When cleaning pre-existing DOTs, only preserve them if the user
  // explicitly requested `--dot`. If DOTs are implied by `--svg` we
  // should still remove leftover DOT files from previous runs.
  await cleanDotFilesIfNotRequested(dotOut, dotExplicit, opts.verbose);
  if (dotOut !== dir) {
    await cleanDotFilesIfNotRequested(dir, dotExplicit, opts.verbose);
  }
  if (dotOut && dotRequested) {
    await processDotSvgGeneration({ opts, outFile, dotOut, dotExplicit, verbose: opts.verbose });
  }
  const totalDuration = (Date.now() - startTime) / 1000;
  console.log(chalk.hex('#4DA6FF')(`Total elapsed time: ${totalDuration.toFixed(2)}s`));
  return;
}

run().catch(err => {
  console.error(chalk.red('Error while scanning:'), err);
  process.exit(2);
});
