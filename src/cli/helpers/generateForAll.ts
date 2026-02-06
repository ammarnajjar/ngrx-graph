import chalk from 'chalk';
import path from 'path';
import { convertDotToSvg } from '../svg';
import type { CliOptions } from './types';

export async function generateForAll(opts: CliOptions, outFile: string, dotOut: string, dotExplicit: boolean) {
  const main = await import('../../dot/main');
  const p = await main.generateAllFromJson(outFile, dotOut);
  console.log(chalk.green(`Wrote aggregated DOT file ${p}`));
  if (!opts.svg) return;
  const svgPath = path.join(dotOut, 'all.svg');
  await convertDotToSvg(p, svgPath, {
    preferViz: opts.viz || false,
    dotExplicit,
    verbose: opts.verbose,
  });
}
