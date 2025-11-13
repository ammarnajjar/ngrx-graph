import crypto from 'crypto';
import fg from 'fast-glob';
import fs from 'fs';
import os from 'os';
import pLimit from 'p-limit';
import path from 'path';
import { parseActions } from './parser/actions';
import { parseComponents } from './parser/components';
import { parseEffects } from './parser/effects';
import { PerFileAction, quickActionsFromFiles } from './parser/quickActions';
import { parseReducers } from './parser/reducers';

type CacheEntry = {
  mtimeMs: number;
  hash: string;
  result?: ParseResult | undefined;
};

type Cache = Record<string, CacheEntry>;

export type ParseResult = {
  actions: Array<{ name: string; nested: boolean }>;
  components: Record<string, string[]>;
  effects: Record<string, { input: string[]; output: string[] }>;
  reducers: Record<string, string[]>;
};

const CACHE_DIR = '.cache';
const CACHE_FILE = 'parse-cache.json';

function fileHash(content: string) {
  return crypto.createHash('sha1').update(content).digest('hex');
}

async function loadCache(root: string): Promise<Cache> {
  try {
    const p = path.join(root, CACHE_DIR, CACHE_FILE);
    const raw = await fs.promises.readFile(p, 'utf8');
    return JSON.parse(raw) as Cache;
  } catch {
    return {};
  }
}

async function saveCache(root: string, cache: Cache) {
  const dir = path.join(root, CACHE_DIR);
  await fs.promises.mkdir(dir, { recursive: true });
  const p = path.join(dir, CACHE_FILE);
  await fs.promises.writeFile(p, JSON.stringify(cache, null, 2), 'utf8');
}

async function quickPrefilter(root: string) {
  // look only for likely NgRx-related files (component, effects, reducer, actions)
  const patterns = [
    // cover both the dotted convention (foo.actions.ts) and plain filenames (actions.ts)
    '**/*.component.ts',
    '**/component.ts',
    '**/*.effects.ts',
    '**/effects.ts',
    '**/*.reducer.ts',
    '**/reducer.ts',
    '**/*.actions.ts',
    '**/actions.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/out/**',
  ];
  const entries = await fg(patterns, { cwd: root, absolute: true });
  const suspects: string[] = [];

  const keywords = [/createAction|ofType|createReducer|on\(/, /dispatch\(|store\.dispatch/];

  for (const fp of entries) {
    try {
      const content = await fs.promises.readFile(fp, 'utf8');
      if (keywords.some(k => k.test(content))) suspects.push(fp);
    } catch {
      // ignore read errors
    }
  }

  return suspects;
}

export async function incrementalParse(root: string, options: { concurrency?: number; force?: boolean; verbose?: boolean } = {}): Promise<ParseResult> {
  const start = Date.now();
  if (options.verbose) console.log('incremental: prefiltering files...');
  const cache = await loadCache(root);
  if (options.verbose) console.log('incremental: cache loaded', { time: Date.now() - start, mem: process.memoryUsage() });
  const suspects = await quickPrefilter(root);
  if (options.verbose) console.log(`incremental: suspects found=${suspects.length}`, { time: Date.now() - start, mem: process.memoryUsage() });

  const results: ParseResult = { actions: [], components: {}, effects: {}, reducers: {} };

  // classify suspects into changed/unchanged and update cache metadata
  const changed: string[] = [];
  const unchanged: string[] = [];
  for (const fp of suspects) {
    try {
      const st = await fs.promises.stat(fp);
      const content = await fs.promises.readFile(fp, 'utf8');
      const h = fileHash(content);
      const rel = path.relative(root, fp);
      const prev = cache[rel];
      const isChanged = options.force || !prev || prev.hash !== h || prev.mtimeMs !== st.mtimeMs;
      if (isChanged) changed.push(fp);
      else unchanged.push(fp);
      cache[rel] = Object.assign({}, prev || {}, { mtimeMs: st.mtimeMs, hash: h, result: prev && prev.result ? prev.result : undefined });
    } catch {
      // if we can't read/stat the file, treat as changed to be safe
      changed.push(fp);
    }
  }

  if (options.verbose) console.log(`incremental: changed=${changed.length} unchanged=${unchanged.length}`, { time: Date.now() - start, mem: process.memoryUsage() });

  // If nothing changed and we have a cached full parse, reuse it
  if (changed.length === 0 && cache['__full'] && cache['__full'].result) {
    if (options.verbose) console.log('incremental: cache hit, reusing full parse result', { time: Date.now() - start, mem: process.memoryUsage() });
    return cache['__full'].result as ParseResult;
  }

  // concurrency limiter
  // Determine concurrency: explicit option > env var > auto (CPU-1)
  const envConcurrency = process.env.NGRX_GRAPH_CONCURRENCY ? parseInt(process.env.NGRX_GRAPH_CONCURRENCY, 10) : 0;
  const concurrency = (options.concurrency && options.concurrency > 0)
    ? options.concurrency
    : (envConcurrency && envConcurrency > 0)
      ? envConcurrency
      : Math.max(1, os.cpus().length - 1);
  const limit = pLimit(concurrency);

  // If no cached full result, parse suspects per-file and assemble
  if (!cache['__full'] || !cache['__full'].result) {
    if (options.verbose) console.log('incremental: no cached full parse — parsing suspects per-file', { time: Date.now() - start, mem: process.memoryUsage() });

    // 1) lightweight text-based action discovery to avoid ts-morph where possible
    const quickMap: Record<string, PerFileAction> = quickActionsFromFiles(suspects);
    const quickList: PerFileAction[] = Object.values(quickMap);
    if (options.verbose) console.log('incremental: quick-discovered actions', quickList.length, { time: Date.now() - start, mem: process.memoryUsage() });
    const knownActions = new Set<string>(quickList.map(a => a.id));
    // also record quick results into per-file cache where possible
    for (const fp of suspects) {
      const rel = path.relative(root, fp);
      const existing = cache[rel] && cache[rel].result ? cache[rel].result : undefined;
      if (!existing) {
        // store quick-discovered actions for this file (best-effort)
        const fileActions = quickList.filter(a => a.file === fp).map(a => ({ name: a.id, nested: false }));
        const per: ParseResult = { actions: fileActions, components: {}, effects: {}, reducers: {} };
        cache[rel] = Object.assign({}, cache[rel] || {}, { result: per });
      }
    }

    // 2) parse components/reducers/effects per-file in parallel
    const compTasks = suspects.map(fp => limit(() => Promise.resolve(parseComponents(root, [fp]))));
    const redTasks = suspects.map(fp => limit(() => Promise.resolve(parseReducers(root, [fp]))));
    const effTasks = suspects.map(fp => limit(() => Promise.resolve(parseEffects(root, [fp], knownActions))));

    const [compResults, redResults, effResults] = await Promise.all([Promise.all(compTasks), Promise.all(redTasks), Promise.all(effTasks)]);
    if (options.verbose) console.log('incremental: parsed components/reducers/effects for suspects', { time: Date.now() - start, mem: process.memoryUsage() });

    const actionMap = new Map<string, { nested: boolean }>();
    const componentsMap: Record<string, string[]> = {};
    const effectsMap: Record<string, { input: string[]; output: string[] }> = {};
    const reducersMap: Record<string, string[]> = {};
    // merge per-file results and store per-file cache entries
    for (let i = 0; i < suspects.length; i++) {
      const fp = suspects[i];
      const rel = path.relative(root, fp);
      // best-effort: include any quick-discovered actions for this file as file actions
      const perActions = quickList.filter(a => a.file === fp).map(a => ({ name: a.id, nested: false }));
      for (const a of perActions) {
        const prev = actionMap.get(a.name);
        if (!prev) actionMap.set(a.name, { nested: a.nested });
        else if (a.nested && !prev.nested) prev.nested = true;
      }
      const cr = compResults[i] || {};
      for (const [k, v] of Object.entries(cr)) componentsMap[k] = v;
      const rr = redResults[i] || {};
      for (const [k, v] of Object.entries(rr)) reducersMap[k] = v;
      const er = effResults[i] || {};
      for (const [k, v] of Object.entries(er)) effectsMap[k] = v;

      // persist per-file parse into cache
      cache[rel] = Object.assign({}, cache[rel] || {}, { result: { actions: perActions, components: cr, effects: er, reducers: rr } });
    }

    results.actions = Array.from(actionMap.entries()).map(([name, info]) => ({ name, nested: info.nested }));
    results.components = componentsMap;
    results.effects = effectsMap;
    results.reducers = reducersMap;

    cache['__full'] = { mtimeMs: Date.now(), hash: '', result: results };
    await saveCache(root, cache);
    if (options.verbose) console.log('incremental: saved cache', { time: Date.now() - start, mem: process.memoryUsage() });
    return results;
  }

  // Merge changed files into cached full result
  if (options.verbose) console.log('incremental: merging changed files into cached full parse', { time: Date.now() - start, mem: process.memoryUsage() });
  const base = cache['__full'].result as ParseResult;
  const actionMap = new Map(base.actions.map(a => [a.name, { nested: a.nested } as { nested: boolean }]));
  const componentsMap: Record<string, string[]> = Object.assign({}, base.components);
  const effectsMap: Record<string, { input: string[]; output: string[] }> = Object.assign({}, base.effects);
  const reducersMap: Record<string, string[]> = Object.assign({}, base.reducers);

  // 1) parse actions for changed files first
  if (changed.length > 0) {
    const aTasks = changed.map(fp => limit(() => Promise.resolve(parseActions(root, [fp]))));
    const aResults = await Promise.all(aTasks);
    for (const ar of aResults) for (const a of ar) {
      const prev = actionMap.get(a.name);
      if (!prev) actionMap.set(a.name, { nested: a.nested });
      else if (a.nested && !prev.nested) prev.nested = true;
    }
  }

  const knownActions = new Set(Array.from(actionMap.keys()));

  // 2) parse components/effects/reducers for changed files
  const compTasks = changed.map(fp => limit(() => Promise.resolve(parseComponents(root, [fp]))));
  const redTasks = changed.map(fp => limit(() => Promise.resolve(parseReducers(root, [fp]))));
  const effTasks = changed.map(fp => limit(() => Promise.resolve(parseEffects(root, [fp], knownActions))));

  const [compResults, redResults, effResults] = await Promise.all([Promise.all(compTasks), Promise.all(redTasks), Promise.all(effTasks)]);
  if (options.verbose) console.log('incremental: parsed changed file components/reducers/effects', { time: Date.now() - start, mem: process.memoryUsage() });

  for (const cr of compResults) for (const [k, v] of Object.entries(cr)) componentsMap[k] = v;
  for (const er of effResults) for (const [k, v] of Object.entries(er)) effectsMap[k] = v;
  for (const rr of redResults) for (const [k, v] of Object.entries(rr)) reducersMap[k] = v;

  // update per-file cache entries for changed files
  for (let i = 0; i < changed.length; i++) {
    const fp = changed[i];
    const rel = path.relative(root, fp);
    const ar = await Promise.resolve(parseActions(root, [fp]));
    const cr = await Promise.resolve(parseComponents(root, [fp]));
    const er = await Promise.resolve(parseEffects(root, [fp], knownActions));
    const rr = await Promise.resolve(parseReducers(root, [fp]));
    cache[rel] = Object.assign({}, cache[rel] || {}, { result: { actions: ar.map(a => ({ name: a.name, nested: a.nested })), components: cr, effects: er, reducers: rr } });
  }

  results.actions = Array.from(actionMap.entries()).map(([name, info]) => ({ name, nested: info.nested }));
  results.components = componentsMap;
  results.effects = effectsMap;
  results.reducers = reducersMap;

  cache['__full'] = { mtimeMs: Date.now(), hash: '', result: results };
  await saveCache(root, cache);
  if (options.verbose) console.log('incremental: saved merged cache', { time: Date.now() - start, mem: process.memoryUsage() });

  return results;
}

export default incrementalParse;
