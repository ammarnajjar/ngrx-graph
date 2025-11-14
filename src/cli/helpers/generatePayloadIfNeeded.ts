import chalk from 'chalk';
import fg from 'fast-glob';
import fs from 'fs/promises';
import os from 'os';
import scanActions, { scanComponents, scanEffects, scanReducers } from '../../scan-actions';
import { filterLoadedByAllActions } from '../../scan/index';

export async function generatePayloadIfNeeded(options: {
  useCache: boolean;
  outFile: string;
  outDir: string;
  dir: string;
  concurrency: number;
  pattern: string;
  startTime: number;
  verbose?: boolean;
}) {
  const { useCache, outFile, outDir, dir, concurrency, pattern, startTime, verbose } = options;
  let payload: Record<string, unknown> | undefined;

  if (useCache) {
    try {
      const stat = await fs.stat(outFile).catch(() => null);
      if (stat && stat.isFile()) {
        try {
          const txt = await fs.readFile(outFile, 'utf8');
          payload = JSON.parse(txt);
          console.log(chalk.green(`Using existing JSON payload at ${outFile}`));
          return payload;
        } catch (readErr) {
          console.log(chalk.yellow('Found existing JSON but failed to read/parse it; will re-scan:'), String(readErr));
        }
      }
    } catch {
      // ignore and continue
    }
  }

  if (payload) return payload;

  console.log(chalk.hex('#4DA6FF')(`Scanning directory: ${dir}`));
  console.log(chalk.hex('#4DA6FF')(`Concurrency: ${concurrency}  PID: ${process.pid}`));
  if (verbose) console.log(chalk.hex('#4DA6FF')(`CPUS: ${os.cpus().length}`));

  let filesCount = 0;
  try {
    const files = await fg(pattern, { cwd: dir, onlyFiles: true });
    filesCount = files.length;
  } catch (err) {
    console.log(chalk.yellow('Could not count files for pattern (continuing):'), err);
  }
  if (filesCount && verbose) console.log(chalk.gray(`Found ${filesCount} files matching pattern`));

  const list = await scanActions({ dir, pattern, concurrency });
  const scanDuration = (Date.now() - startTime) / 1000;
  console.log(chalk.green(`Scanning done: found ${list.length} actions in ${scanDuration.toFixed(2)}s`));
  if (verbose) {
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
  const loadedFromComponents = componentsResult.loaded ?? [];
  const loadedFromEffects = effectsResult.loaded ?? [];

  const allActionNames = new Set(allActions.map(a => a.name));
  const loadedActions = [
    ...filterLoadedByAllActions(loadedFromComponents, allActionNames),
    ...filterLoadedByAllActions(loadedFromEffects, allActionNames),
  ];

  for (const [comp, acts] of Object.entries(fromComponents)) {
    const kept = (acts || []).filter(a => allActionNames.has(a));
    if (kept.length) fromComponents[comp] = kept;
    else delete fromComponents[comp];
  }

  for (const [r, acts] of Object.entries(fromReducers)) {
    const kept = (acts || []).filter(a => allActionNames.has(a));
    if (kept.length) fromReducers[r] = kept;
    else delete fromReducers[r];
  }

  for (const [k, v] of Object.entries(fromEffects)) {
    const inp = (v.input || []).filter(x => allActionNames.has(x));
    const out = (v.output || []).filter(x => allActionNames.has(x));
    if (inp.length || out.length) fromEffects[k] = { input: inp, output: out };
    else delete fromEffects[k];
  }

  payload = { allActions, fromComponents, fromEffects, fromReducers, loadedActions };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(chalk.green(`Wrote ${outFile}`));
  return payload;
}
