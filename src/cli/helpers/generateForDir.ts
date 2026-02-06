import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { convertDotToSvg } from '../svg';
import type { CliOptions } from './types';

export async function generateForDir(
  opts: CliOptions,
  outFile: string,
  dotOut: string,
  dotExplicit: boolean,
  verbose?: boolean,
) {
  const gen = await import('../../dot-generator');
  await gen.generateDotFilesFromJson(outFile, dotOut);
  console.log(chalk.green(`Wrote DOT files to ${dotOut}`));
  if (!opts.svg) return;
  try {
    const files = await fs.readdir(dotOut);
    for (const f of files.filter(x => x.endsWith('.dot'))) {
      const dotPath = path.join(dotOut, f);
      const svgPath = path.join(dotOut, `${path.basename(f, '.dot')}.svg`);
      await convertDotToSvg(dotPath, svgPath, {
        preferViz: opts.viz || false,
        dotExplicit,
        verbose: verbose || opts.verbose,
      });
    }
  } catch (err) {
    if (verbose || opts.verbose) {
      console.log(chalk.yellow('Could not generate SVGs:'), err instanceof Error ? err.message : String(err));
    }
  }
}
