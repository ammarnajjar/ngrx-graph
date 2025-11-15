import { generateForAction } from './generateForAction';
import { generateForAll } from './generateForAll';
import { generateForDir } from './generateForDir';
import type { GenerateDotOptions } from './types';

export async function processDotSvgGeneration(options: GenerateDotOptions) {
  const { opts, outFile, dotOut, dotExplicit, verbose } = options;
  if (opts.action) {
    await generateForAction(opts, outFile, dotOut, dotExplicit);
    return;
  }
  if (opts.all) {
    await generateForAll(opts, outFile, dotOut, dotExplicit);
    return;
  }
  await generateForDir(opts, outFile, dotOut, dotExplicit, verbose);
}
