#!/usr/bin/env node
import chalk from 'chalk';
import { execFile } from 'child_process';
import { Command } from 'commander';
import fg from 'fast-glob';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import scanActions, { scanComponents, scanEffects, scanReducers } from './scan-actions';
async function renderDotWithViz(dotText: string) {
  try {
    // prefer the CJS helper which uses require and is simpler to type
    // @ts-expect-error - dynamic CJS helper, declaration may be missing in some toolchains
    const helper = await import('./cli/viz-fallback.cjs');
    return await helper.renderDotWithViz(dotText);
  } catch {
    return null;
  }
}

const program = new Command();

program
  .name('ngrx-graph')
  .description('Scan a project for NgRx actions declarations')
  .option('-d, --dir <dir>', 'Directory to scan', process.cwd())
  .option('-o, --out [dir]', "output directory where 'ngrx-graph.json' will be written (defaults to scan dir)")
  .option('-v, --verbose', 'enable verbose logging', false)
  .option('-c, --concurrency <n>', 'concurrency for file parsing', String(8))
  .option('-s, --svg', 'also generate SVG files from DOT (requires Graphviz `dot` on PATH)', false)
  .option('-a, --all', 'only generate the aggregated all.dot (no per-action files)', false)
  .option('--dot', 'also generate DOT files (per-action and aggregated)', false)
  .option('-j, --json', 'scan and write ngrx-graph.json only (no DOT/SVG)', false)
  .option('--cache', 'reuse existing ngrx-graph.json if present (skip scanning)', false)
  .argument('[action]', 'action name to focus (positional; overrides --action and --all)')
  .addHelpText('after', `

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
`)
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
  const concurrency = Math.max(1, parseInt(opts.concurrency, 10) || 8);
  const pattern = '**/*actions.ts';

  // resolve output directory early so we can check for an existing JSON
  const outDir = opts.out
    ? (path.isAbsolute(opts.out) ? path.resolve(opts.out) : path.resolve(process.cwd(), opts.out))
    : dir;
  const outFile = path.join(outDir, 'ngrx-graph.json');

  const startTime = Date.now();

  // If JSON already exists and --json not provided, reuse it and skip the scan
  // only when the user explicitly requested `--cache`.
  let payload: Record<string, unknown> | undefined;
  if (useCache) {
    try {
      const stat = await fs.stat(outFile).catch(() => null);
      if (stat && stat.isFile()) {
        try {
          const txt = await fs.readFile(outFile, 'utf8');
          payload = JSON.parse(txt);
          console.log(chalk.green(`Using existing JSON payload at ${outFile}`));
        } catch (readErr) {
          console.log(chalk.yellow('Found existing JSON but failed to read/parse it; will re-scan:'), String(readErr));
        }
      }
    } catch {
      // ignore and fall back to scanning
    }
  }

  if (!payload) {
    console.log(chalk.hex('#4DA6FF')(`Scanning directory: ${dir}`));
    console.log(chalk.hex('#4DA6FF')(`Concurrency: ${concurrency}  PID: ${process.pid}`));
    if (opts.verbose) console.log(chalk.hex('#4DA6FF')(`CPUS: ${os.cpus().length}`));
    // count files matching pattern for progress info
    let filesCount = 0;
    try {
      const files = await fg(pattern, { cwd: dir, onlyFiles: true });
      filesCount = files.length;
    } catch (err) {
      console.log(chalk.yellow('Could not count files for pattern (continuing):'), err);
    }
    if (filesCount && opts.verbose) console.log(chalk.gray(`Found ${filesCount} files matching pattern`));
    const list = await scanActions({ dir, pattern, concurrency });
    const scanDuration = (Date.now() - startTime) / 1000;
    console.log(chalk.green(`Scanning done: found ${list.length} actions in ${scanDuration.toFixed(2)}s`));
    if (opts.verbose) {
      console.log(chalk.gray('Actions:'));
      for (const a of list) {
        console.log(` - ${a.name ?? '<anonymous>'} (${a.kind}) ${a.nested ? '[nested]' : ''} — ${a.file}`);
      }
    }

    const allActions = list.map(a => ({ name: a.name ?? '', nested: !!a.nested }));
    const componentsResult = await scanComponents({ dir, pattern: '**/*.component.ts', concurrency });
    const fromComponents = componentsResult.mapping ?? {};
    const effectsResult = await scanEffects({ dir, pattern: '**/*.effects.ts', concurrency });
    const fromEffects = effectsResult.mapping ?? {};
    const reducersResult = await scanReducers({ dir, pattern: '**/*reducer*.ts', concurrency });
    const fromReducers = reducersResult.mapping ?? {};
    // merge loaded actions from components and effects
    const loadedFromComponents = componentsResult.loaded ?? [];
    const loadedFromEffects = effectsResult.loaded ?? [];
    const loadedActions = [...loadedFromComponents, ...loadedFromEffects];
    payload = { allActions, fromComponents, fromEffects, fromReducers, loadedActions };

    // always write the JSON payload to disk
    await import('fs/promises').then(async fsx => {
      await fsx.mkdir(outDir, { recursive: true });
      await fsx.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8');
    });
    console.log(chalk.green(`Wrote ${outFile}`));
  }

  // --json: always regenerate the JSON file first. If --json is used alone
  // (no other generation flags), stop after writing JSON. If combined with
  // other flags (positional action, --all, or --svg), continue to generate
  // DOT/SVG after regenerating the JSON.
  const hasGenerationFlags = !!(opts.action || opts.all || opts.svg);
  // DOT generation is opt-in via --dot; requesting SVG implies DOT generation
  const dotRequested = Boolean(opts.dot) || Boolean(opts.svg);
  if (opts.json && !hasGenerationFlags) {
    const totalDuration = (Date.now() - startTime) / 1000;
    console.log(chalk.hex('#4DA6FF')(`Total elapsed time: ${totalDuration.toFixed(2)}s`));
    return;
  }

  // Use the resolved output directory for DOT/SVG when an explicit --out
  // directory was provided. Otherwise fall back to the scan directory.
  const dotOut = outDir || dir;
  if (dotOut && dotRequested) {
    if (opts.action) {
      const gen = await import('./dot-generator');
      const p = await gen.generateDotForAction(outFile, opts.action, dotOut);
      console.log(chalk.green(`Wrote focused DOT file ${p}`));
      if (opts.svg) {
        // try to convert the focused dot to svg
        try {
          const svgPath = path.join(dotOut, `${opts.action}.svg`);
          const execFileP = promisify(execFile);
          await execFileP('dot', ['-Tsvg', p, '-o', svgPath]);
          console.log(chalk.green(`Wrote SVG file ${svgPath}`));
        } catch (err) {
          console.log(chalk.yellow('Could not generate SVG with `dot` (falling back to viz.js):'), String(err));
          try {
            const dotTxt = await fs.readFile(p, 'utf8');
            const svgPathFallback = path.join(dotOut, `${opts.action}.svg`);
            const svg = await renderDotWithViz(dotTxt);
            if (svg) {
              await fs.writeFile(svgPathFallback, svg, 'utf8');
              console.log(chalk.green(`Wrote SVG file ${svgPathFallback} (via viz.js)`));
            } else {
              console.log(chalk.yellow('Could not generate SVG via viz.js (install viz.js to enable fallback)'));
            }
          } catch (readErr) {
            console.log(chalk.yellow('Could not read DOT file for viz.js fallback:'), String(readErr));
          }
        }
      }
    } else if (opts.all) {
      const main = await import('./dot/main');
      const p = await main.generateAllFromJson(outFile, dotOut);
      console.log(chalk.green(`Wrote aggregated DOT file ${p}`));
      if (opts.svg) {
        // convert only the all.dot to svg
        try {
          const execFileP = promisify(execFile);
          const svgPath = path.join(dotOut, 'all.svg');
          await execFileP('dot', ['-Tsvg', p, '-o', svgPath]);
          console.log(chalk.green(`Wrote SVG file ${svgPath}`));
        } catch (innerErr) {
          console.log(chalk.yellow(`Failed to convert all.dot -> svg with dot (falling back to viz.js):`), String(innerErr));
          try {
            const dotTxt = await fs.readFile(p, 'utf8');
            const svgPathFallback = path.join(dotOut, 'all.svg');
            const svg = await renderDotWithViz(dotTxt);
            if (svg) {
              await fs.writeFile(svgPathFallback, svg, 'utf8');
              console.log(chalk.green(`Wrote SVG file ${svgPathFallback} (via viz.js)`));
            } else {
              console.log(chalk.yellow(`Could not generate SVG for ${p} via viz.js (install viz.js to enable fallback)`));
            }
          } catch (readErr) {
            console.log(chalk.yellow(`Could not read DOT file ${p} for viz.js fallback:`), String(readErr));
          }
        }
      }
    } else {
      const gen = await import('./dot-generator');
      await gen.generateDotFilesFromJson(outFile, dotOut);
      console.log(chalk.green(`Wrote DOT files to ${dotOut}`));
      if (opts.svg) {
        // convert all .dot files in the output dir to .svg
        try {
          const execFileP = promisify(execFile);
          const files = await fs.readdir(dotOut);
          for (const f of files.filter(x => x.endsWith('.dot'))) {
            const dotPath = path.join(dotOut, f);
            const svgPath = path.join(dotOut, `${path.basename(f, '.dot')}.svg`);
            try {
              await execFileP('dot', ['-Tsvg', dotPath, '-o', svgPath]);
              console.log(chalk.green(`Wrote SVG file ${svgPath}`));
            } catch (innerErr) {
              console.log(chalk.yellow(`Failed to convert ${dotPath} -> svg with dot (falling back to viz.js):`), String(innerErr));
              try {
                const dotTxt = await fs.readFile(dotPath, 'utf8');
                const svgPathFallback = svgPath;
                const svg = await renderDotWithViz(dotTxt);
                if (svg) {
                  await fs.writeFile(svgPathFallback, svg, 'utf8');
                  console.log(chalk.green(`Wrote SVG file ${svgPathFallback} (via viz.js)`));
                } else {
                  console.log(chalk.yellow(`Could not generate SVG for ${dotPath} via viz.js (install viz.js to enable fallback)`));
                }
              } catch (readErr) {
                console.log(chalk.yellow(`Could not read DOT file ${dotPath} for viz.js fallback:`), String(readErr));
              }
            }
          }
        } catch (err) {
          console.log(chalk.yellow('Could not generate SVGs (is Graphviz `dot` installed?):'), String(err));
        }
      }
    }
  }
  const totalDuration = (Date.now() - startTime) / 1000;
  console.log(chalk.hex('#4DA6FF')(`Total elapsed time: ${totalDuration.toFixed(2)}s`));
  return;

}

run().catch(err => {
  console.error(chalk.red('Error while scanning:'), err);
  process.exit(2);
});
