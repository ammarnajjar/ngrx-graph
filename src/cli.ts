#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import fg from 'fast-glob';
import os from 'os';
import path from 'path';
import scanActions, { scanComponents, scanEffects, scanReducers } from './scan-actions';

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
