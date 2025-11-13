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
  .name('scan-actions')
  .description('Scan a project for NgRx actions declarations')
  .option('-d, --dir <dir>', 'Directory to scan', process.cwd())
  .option('-p, --pattern <pattern>', 'glob pattern for action files', '**/*actions.ts')
  .option('--json', 'output JSON')
  .option('-o, --out <file>', 'output JSON file', undefined)
  .option('-v, --verbose', 'enable verbose logging', false)
  .option('-c, --concurrency <n>', 'concurrency for file parsing', String(8))
  .option('--dot <dir>', 'generate DOT files from produced JSON into directory', undefined)
  .option('--svg', 'also generate SVG files from DOT (requires Graphviz `dot` on PATH)', false)
  .option('--action <name>', 'generate focused DOT for an action name', undefined)
  .parse(process.argv);

const opts = program.opts();

async function run() {
  const dir = path.resolve(opts.dir);
  const concurrency = Math.max(1, parseInt(opts.concurrency, 10) || 8);
  console.log(chalk.blue(`Scanning directory: ${dir}`));
  console.log(chalk.blue(`Pattern: ${opts.pattern}  Concurrency: ${concurrency}  PID: ${process.pid}`));
  if (opts.verbose) console.log(chalk.blue(`CPUS: ${os.cpus().length}`));
  const startTime = Date.now();
  // count files matching pattern for progress info
  let filesCount = 0;
  try {
    const files = await fg(opts.pattern, { cwd: dir, onlyFiles: true });
    filesCount = files.length;
  } catch (err) {
    console.log(chalk.yellow('Could not count files for pattern (continuing):'), err);
  }
  if (filesCount && opts.verbose) console.log(chalk.gray(`Found ${filesCount} files matching pattern`));
  const list = await scanActions({ dir, pattern: opts.pattern, concurrency });
  const scanDuration = (Date.now() - startTime) / 1000;
  console.log(chalk.green(`Scanning done: found ${list.length} actions in ${scanDuration.toFixed(2)}s`));
  if (opts.verbose) {
    console.log(chalk.gray('Actions:'));
    for (const a of list) {
      console.log(` - ${a.name ?? '<anonymous>'} (${a.kind}) ${a.nested ? '[nested]' : ''} — ${a.file}`);
    }
  }
  if (opts.json) {
    // when --out is provided write to file, otherwise print
    const outFile = opts.out ? path.resolve(opts.out) : path.join(dir, 'ngrx-graph.json');
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
    const payload = { allActions, fromComponents, fromEffects, fromReducers, loadedActions };
    if (opts.out) {
      await import('fs/promises').then(fs => fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8'));
      console.log(chalk.green(`Wrote ${outFile}`));
      if (opts.dot) {
        const gen = await import('./dot-generator');
        if (opts.action) {
          const p = await gen.generateDotForAction(outFile, opts.action, opts.dot);
          console.log(chalk.green(`Wrote focused DOT file ${p}`));
            if (opts.svg) {
              // try to convert the focused dot to svg
              try {
                const svgPath = path.join(opts.dot, `${opts.action}.svg`);
                const execFileP = promisify(execFile);
                await execFileP('dot', ['-Tsvg', p, '-o', svgPath]);
                console.log(chalk.green(`Wrote SVG file ${svgPath}`));
              } catch (err) {
                console.log(chalk.yellow('Could not generate SVG with `dot` (falling back to viz.js):'), String(err));
                try {
                  const dotTxt = await fs.readFile(p, 'utf8');
                  const svgPathFallback = path.join(opts.dot, `${opts.action}.svg`);
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
        } else {
          await gen.generateDotFilesFromJson(outFile, opts.dot);
          console.log(chalk.green(`Wrote DOT files to ${opts.dot}`));
            if (opts.svg) {
              // convert all .dot files in the output dir to .svg
              try {
                const execFileP = promisify(execFile);
                const files = await fs.readdir(opts.dot);
                for (const f of files.filter(x => x.endsWith('.dot'))) {
                  const dotPath = path.join(opts.dot, f);
                  const svgPath = path.join(opts.dot, `${path.basename(f, '.dot')}.svg`);
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
    } else {
      console.log(JSON.stringify(payload, null, 2));
    }
    const totalDuration = (Date.now() - startTime) / 1000;
    console.log(chalk.blue(`Total elapsed time: ${totalDuration.toFixed(2)}s`));
    return;
  }

  if (!list.length) {
    console.log(chalk.yellow('No actions found.'));
    return;
  }

  for (const a of list) {
    console.log(chalk.cyan(a.file));
    console.log(`  ${chalk.green(a.kind)} ${a.name ?? ''} ${a.type ? `-> ${a.type}` : ''}`);
  }
}

run().catch(err => {
  console.error(chalk.red('Error while scanning:'), err);
  process.exit(2);
});
