import fs from 'fs';

export type PerFileAction = { id: string; label: string; file: string };

/**
 * Scans files quickly (text-based) to find top-level exported `createAction` usages.
 * Returns a mapping of action id -> { id, label, file } where `id` is either the exported
 * identifier (preferred) or the label string when identifier isn't exported.
 */
export function quickActionsFromFiles(
  filePaths: string[]
): Record<string, PerFileAction> {
  const out: Record<string, PerFileAction> = {};

  for (const file of filePaths) {
    try {
      const src = fs.readFileSync(file, 'utf8');

      // Try to directly capture patterns like: export const doThing = createAction('[A] Do thing')
      const exportWithLabelRegex = /export\s+const\s+([A-Za-z0-9_$]+)\s*=\s*createAction\s*\(\s*(['"`])([^'"`]+)\2/gi;
      const createActionLabelRegex = /createAction\s*\(\s*(['"`])([^'"`]+)\1/gi;

      const labels: string[] = [];
      let lm: RegExpExecArray | null;
      while ((lm = createActionLabelRegex.exec(src))) {
        labels.push(lm[2]);
      }

      let em: RegExpExecArray | null;
      while ((em = exportWithLabelRegex.exec(src))) {
        const ident = em[1];
        const label = em[3] || ident;
        out[ident] = { id: ident, label, file };
      }

      // Include any createAction labels that were not part of an export as fallbacks
      for (const lbl of labels) {
        if (!out[lbl] && !out[lbl.replace(/\s+/g, '_')]) {
          out[lbl] = { id: lbl, label: lbl, file };
        }
      }
    } catch {
      // ignore unreadable files
    }
  }

  return out;
}

export default quickActionsFromFiles;
