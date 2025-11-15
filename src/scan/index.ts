import fg from 'fast-glob';
import pLimit from 'p-limit';
import { ActionInfo, parseActionsFromFile, parseActionsFromText } from './actions';
import { parseComponentsFromFile, parseComponentsFromText } from './components';
import { parseEffectsFromFile, parseEffectsFromText } from './effects';
import { parseReducersFromFile, parseReducersFromText } from './reducers';

export {
  parseActionsFromFile,
  parseActionsFromText,
  parseComponentsFromFile,
  parseComponentsFromText,
  parseEffectsFromFile,
  parseEffectsFromText,
  parseReducersFromFile,
  parseReducersFromText
};

export async function scanActions(options?: { dir?: string; pattern?: string; concurrency?: number }) {
  const dir = options?.dir ?? process.cwd();
  const pattern = options?.pattern ?? '**/*actions.ts';
  const concurrency = options?.concurrency ?? 8;
  const entries = await fg(pattern, { cwd: dir, absolute: true, onlyFiles: true });
  const limit = pLimit(concurrency);
  const tasks = entries.map(p => limit(() => parseActionsFromFile(p)));
  const nested = await Promise.all(tasks);
  const flat = nested.flat() as ActionInfo[];


  const names = new Set(flat.map(a => a.name).filter(Boolean) as string[]);
  for (const a of flat) {
    if (a.propsTypeText) {
      const txt = a.propsTypeText;
      if (/\b(Action|ReturnType|typeof)\b/.test(txt)) {
        a.nested = true;
        continue;
      }
      for (const n of names) {
        if (!n) continue;
        const re = new RegExp('\\b' + n + '\\b');
        if (re.test(txt)) {
          a.nested = true;
          break;
        }
      }
    }
  }
  return flat;
}

export async function scanComponents(options?: { dir?: string; pattern?: string; concurrency?: number }) {
  const dir = options?.dir ?? process.cwd();
  const pattern = options?.pattern ?? '**/*.component.ts';
  const entries = await fg(pattern, { cwd: dir, absolute: true, onlyFiles: true });
  const res: Record<string, string[]> = {};
  const loaded: Array<{ name: string; payloadActions: string[] }> = [];
  for (const file of entries) {
    try {
      const r = await parseComponentsFromFile(file);
      Object.assign(res, r.mapping);
      loaded.push(...r.loaded);
    } catch {
      void 0;
    }
  }
  return { mapping: res, loaded };
}

export async function scanEffects(options?: { dir?: string; pattern?: string; concurrency?: number }) {
  const dir = options?.dir ?? process.cwd();
  const pattern = options?.pattern ?? '**/*.effects.ts';
  const entries = await fg(pattern, { cwd: dir, absolute: true, onlyFiles: true });
  const res: Record<string, { input: string[]; output: string[] }> = {};
  const loaded: Array<{ name: string; payloadActions: string[] }> = [];
  for (const file of entries) {
    try {
      const r = await parseEffectsFromFile(file);
      Object.assign(res, r.mapping);
      loaded.push(...r.loaded);
    } catch {
      void 0;
    }
  }
  return { mapping: res, loaded };
}

// filter loaded payloadActions by global action names
export function filterLoadedByAllActions(
  loaded: Array<{ name: string; payloadActions: string[] }>,
  allActionNames: Set<string>,
) {
  return loaded
    .map(l => ({ name: l.name, payloadActions: l.payloadActions.filter(p => allActionNames.has(p)) }))
    .filter(l => l.payloadActions && l.payloadActions.length);
}

export async function scanReducers(options?: { dir?: string; pattern?: string; concurrency?: number }) {
  const dir = options?.dir ?? process.cwd();
  const pattern = options?.pattern ?? '**/*reducer*.ts';
  const concurrency = options?.concurrency ?? 8;
  const entries = await fg(pattern, { cwd: dir, absolute: true, onlyFiles: true });
  const limit = pLimit(concurrency);
  const res: Record<string, string[]> = {};
  const tasks = entries.map(p =>
    limit(async () => {
      try {
        const r = await parseReducersFromFile(p);
        Object.assign(res, r.mapping);
      } catch {
        void 0;
      }
    }),
  );
  await Promise.all(tasks);
  return { mapping: res };
}

export default { scanActions, scanComponents, scanEffects, scanReducers };
