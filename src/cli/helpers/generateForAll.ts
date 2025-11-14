import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { renderDotWithViz, tryDotToSvg } from '../svg';
import type { CliOptions } from './types';

export async function generateForAll(opts: CliOptions, outFile: string, dotOut: string, dotExplicit: boolean) {
  const main = await import('../../dot/main');
  const p = await main.generateAllFromJson(outFile, dotOut);
  console.log(chalk.green(`Wrote aggregated DOT file ${p}`));
  if (!opts.svg) return;
  const svgPath = path.join(dotOut, 'all.svg');
  if (opts.viz) {
    try {
      const dotTxt = await fs.readFile(p, 'utf8');
      const svg = await renderDotWithViz(dotTxt);
      if (svg) {
        await fs.writeFile(svgPath, svg, 'utf8');
        console.log(chalk.green(`Wrote SVG file ${svgPath} (via viz.js)`));
        if (!dotExplicit) await fs.rm(p).catch(() => {});
        return;
      }
      const ok = await tryDotToSvg(p, svgPath);
      if (ok) console.log(chalk.green(`Wrote SVG file ${svgPath}`));
    } catch (err) {
      console.log(chalk.yellow('Could not generate SVG via viz.js (falling back to dot):'), String(err));
      const ok = await tryDotToSvg(p, svgPath);
      if (!ok) console.log(chalk.yellow('Could not generate SVG with `dot` either'));
      if (!dotExplicit) await fs.rm(p).catch(() => {});
    }
  } else {
    const ok = await tryDotToSvg(p, svgPath);
    if (ok) {
      console.log(chalk.green(`Wrote SVG file ${svgPath}`));
      if (!dotExplicit) await fs.rm(p).catch(() => {});
    } else {
      try {
        const dotTxt = await fs.readFile(p, 'utf8');
        const svg = await renderDotWithViz(dotTxt);
        if (svg) {
          await fs.writeFile(svgPath, svg, 'utf8');
          console.log(chalk.green(`Wrote SVG file ${svgPath} (via viz.js)`));
          if (!dotExplicit) await fs.rm(p).catch(() => {});
        } else {
          console.log(chalk.yellow(`Could not generate SVG for ${p} via viz.js (install viz.js to enable fallback)`));
        }
      } catch (readErr) {
        console.log(chalk.yellow(`Could not read DOT file ${p} for viz.js fallback:`), String(readErr));
      }
    }
  }
}
