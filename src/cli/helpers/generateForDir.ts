import chalk from 'chalk';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { renderDotWithViz, tryDotToSvg } from '../svg';
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
    const execFileP = promisify(execFile);
    const files = await fs.readdir(dotOut);
    for (const f of files.filter(x => x.endsWith('.dot'))) {
      const dotPath = path.join(dotOut, f);
      const svgPath = path.join(dotOut, `${path.basename(f, '.dot')}.svg`);
      if (opts.viz) {
        try {
          const dotTxt = await fs.readFile(dotPath, 'utf8');
          const svg = await renderDotWithViz(dotTxt);
          if (svg) {
            await fs.writeFile(svgPath, svg, 'utf8');
            console.log(chalk.green(`Wrote SVG file ${svgPath} (via viz.js)`));
            if (!dotExplicit) await fs.rm(dotPath).catch(() => {});
          } else {
            const ok = await tryDotToSvg(dotPath, svgPath);
            if (ok) console.log(chalk.green(`Wrote SVG file ${svgPath}`));
          }
        } catch (err) {
          console.log(chalk.yellow('Could not generate SVG via viz.js (falling back to dot):'), String(err));
          const ok = await tryDotToSvg(dotPath, svgPath);
          if (!ok) console.log(chalk.yellow(`Could not generate SVG for ${dotPath} with dot either`));
          if (!dotExplicit) await fs.rm(dotPath).catch(() => {});
        }
      } else {
        try {
          await execFileP('dot', ['-Tsvg', dotPath, '-o', svgPath]);
          console.log(chalk.green(`Wrote SVG file ${svgPath}`));
          if (!dotExplicit) {
            await fs.rm(dotPath).catch(() => {});
            if (verbose) console.log(chalk.gray(`Removed DOT file ${dotPath} after SVG generation`));
          }
        } catch (innerErr) {
          console.log(
            chalk.yellow(`Failed to convert ${dotPath} -> svg with dot (falling back to viz.js):`),
            String(innerErr),
          );
          try {
            const dotTxt = await fs.readFile(dotPath, 'utf8');
            const svgPathFallback = svgPath;
            const svg = await renderDotWithViz(dotTxt);
            if (svg) {
              await fs.writeFile(svgPathFallback, svg, 'utf8');
              console.log(chalk.green(`Wrote SVG file ${svgPathFallback} (via viz.js)`));
              if (!dotExplicit) {
                await fs.rm(dotPath).catch(() => {});
                if (verbose)
                  console.log(chalk.gray(`Removed DOT file ${dotPath} after SVG generation (viz.js fallback)`));
              }
            } else {
              console.log(
                chalk.yellow(`Could not generate SVG for ${dotPath} via viz.js (install viz.js to enable fallback)`),
              );
            }
          } catch (readErr) {
            console.log(chalk.yellow(`Could not read DOT file ${dotPath} for viz.js fallback:`), String(readErr));
          }
        }
      }
    }
  } catch (err) {
    console.log(chalk.yellow('Could not generate SVGs (is Graphviz `dot` installed?):'), String(err));
  }
}
