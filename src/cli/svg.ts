import { execFile } from 'child_process';
import fs from 'fs/promises';
import { promisify } from 'util';

export async function tryDotToSvg(dotPath: string, svgPath: string): Promise<boolean> {
  try {
    const execFileP = promisify(execFile);
    await execFileP('dot', ['-Tsvg', dotPath, '-o', svgPath]);
    return true;
  } catch {
    return false;
  }
}

export async function renderDotWithViz(dotText: string): Promise<string | null> {
  try {
    // Prefer require() so tests can inject the helper into Module._cache.
    // If require fails (ESM-only contexts), fall back to dynamic import().
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const helper = require('./viz-fallback.cjs');
    return await helper.renderDotWithViz(dotText);
  } catch {
    try {
      // dynamic import for ESM environments
      // @ts-expect-error dynamic import
      const helper = await import('./viz-fallback.cjs');
      return await helper.renderDotWithViz(dotText);
    } catch {
      return null;
    }
  }
}

export async function tryDotOrViz(dotPath: string, svgPath: string, preferViz = false) {
  if (preferViz) {
    try {
      const dt = await fs.readFile(dotPath, 'utf8');
      const svg = await renderDotWithViz(dt);
      if (svg) {
        await fs.writeFile(svgPath, svg, 'utf8');
        return { ok: true, via: 'viz' };
      }
    } catch {
      // Silently fall back to dot
    }
    const ok = await tryDotToSvg(dotPath, svgPath);
    return { ok, via: ok ? 'dot' : 'none' };
  }
  const ok = await tryDotToSvg(dotPath, svgPath);
  if (ok) return { ok: true, via: 'dot' };
  try {
    const dt = await fs.readFile(dotPath, 'utf8');
    const svg = await renderDotWithViz(dt);
    if (svg) {
      await fs.writeFile(svgPath, svg, 'utf8');
      return { ok: true, via: 'viz' };
    }
  } catch {
    // Silently fall back to none
  }
  return { ok: false, via: 'none' };
}

/**
 * Converts a DOT file to SVG with intelligent fallback logic and cleanup.
 * Tries viz.js first if preferViz is true, otherwise tries dot first.
 * Handles cleanup of DOT file if dotExplicit is false.
 */
export async function convertDotToSvg(
  dotPath: string,
  svgPath: string,
  options: {
    preferViz: boolean;
    dotExplicit: boolean;
    verbose?: boolean;
  }
): Promise<void> {
  const { preferViz, dotExplicit, verbose } = options;
  const chalk = await import('chalk').then(m => m.default);

  if (preferViz) {
    try {
      const dotTxt = await fs.readFile(dotPath, 'utf8');
      const svg = await renderDotWithViz(dotTxt);
      if (svg) {
        await fs.writeFile(svgPath, svg, 'utf8');
        console.log(chalk.green(`Wrote SVG file ${svgPath} (via viz.js)`));
        if (!dotExplicit) {
          await fs.rm(dotPath).catch(() => {});
          if (verbose) console.log(chalk.gray(`Removed DOT file ${dotPath} after SVG generation`));
        }
        return;
      }
      const ok = await tryDotToSvg(dotPath, svgPath);
      if (ok) {
        console.log(chalk.green(`Wrote SVG file ${svgPath}`));
        if (!dotExplicit) {
          await fs.rm(dotPath).catch(() => {});
          if (verbose) console.log(chalk.gray(`Removed DOT file ${dotPath} after SVG generation`));
        }
      }
    } catch (err) {
      if (verbose) console.log(chalk.yellow('Could not generate SVG via viz.js (falling back to dot):'), err instanceof Error ? err.message : String(err));
      const ok = await tryDotToSvg(dotPath, svgPath);
      if (!ok) {
        console.log(chalk.yellow('Could not generate SVG with `dot` either'));
      } else {
        console.log(chalk.green(`Wrote SVG file ${svgPath}`));
      }
      if (!dotExplicit) {
        await fs.rm(dotPath).catch(() => {});
        if (verbose) console.log(chalk.gray(`Removed DOT file ${dotPath} after SVG generation`));
      }
    }
  } else {
    const ok = await tryDotToSvg(dotPath, svgPath);
    if (ok) {
      console.log(chalk.green(`Wrote SVG file ${svgPath}`));
      if (!dotExplicit) {
        await fs.rm(dotPath).catch(() => {});
        if (verbose) console.log(chalk.gray(`Removed DOT file ${dotPath} after SVG generation`));
      }
    } else {
      if (verbose) console.log(chalk.yellow('Could not generate SVG with `dot` (falling back to viz.js)'));
      try {
        const dotTxt = await fs.readFile(dotPath, 'utf8');
        const svg = await renderDotWithViz(dotTxt);
        if (svg) {
          await fs.writeFile(svgPath, svg, 'utf8');
          console.log(chalk.green(`Wrote SVG file ${svgPath} (via viz.js)`));
          if (!dotExplicit) {
            await fs.rm(dotPath).catch(() => {});
            if (verbose) console.log(chalk.gray(`Removed DOT file ${dotPath} after SVG generation`));
          }
        } else {
          console.log(chalk.yellow('Could not generate SVG via viz.js (install viz.js to enable fallback)'));
        }
      } catch (readErr) {
        if (verbose) console.log(chalk.yellow('Could not read DOT file for viz.js fallback:'), readErr instanceof Error ? readErr.message : String(readErr));
      }
    }
  }
}

export default { tryDotToSvg, renderDotWithViz, tryDotOrViz, convertDotToSvg };
