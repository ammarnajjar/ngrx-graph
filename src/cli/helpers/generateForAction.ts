import chalk from 'chalk';
import path from 'path';
import { convertDotToSvg } from '../svg';
import type { CliOptions } from './types';

export async function generateForAction(opts: CliOptions, outFile: string, dotOut: string, dotExplicit: boolean) {
  const gen = await import('../../dot-generator');
  const p = await gen.generateDotForAction(outFile, opts.action as string, dotOut);
  console.log(chalk.green(`Wrote focused DOT file ${p}`));
  if (!opts.svg) return;
  const svgPath = path.join(dotOut, `${opts.action}.svg`);
  await convertDotToSvg(p, svgPath, {
    preferViz: opts.viz || false,
    dotExplicit,
    verbose: opts.verbose,
  });
}
