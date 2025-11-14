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
    // prefer the CJS helper which uses require and is simpler to type
    // @ts-expect-error dynamic CJS helper
    const helper = await import('./viz-fallback.cjs');
    return await helper.renderDotWithViz(dotText);
  } catch {
    return null;
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
      // ignore and fallback to dot
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
    // ignore
  }
  return { ok: false, via: 'none' };
}

export default { tryDotToSvg, renderDotWithViz, tryDotOrViz };
