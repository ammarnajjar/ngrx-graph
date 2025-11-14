
jest.mock('fs/promises', () => {
  const actual = jest.requireActual('fs/promises');
  return {
    ...actual, // retain mkdtemp and other real methods
    mkdir: jest.fn((...args) => actual.mkdir(...args)),
    writeFile: jest.fn((...args) => actual.writeFile(...args)),
    readFile: jest.fn((...args) => actual.readFile(...args)),
  };
});

jest.mock('../../../src/dot/nodes', () => ({
  makeNodes: jest.fn(() => ['N1', 'N2']),
}));

jest.mock('../../../src/dot/edges', () => ({
  dedupeLines: (lines: string[]) => lines,
  makeEdges: jest.fn(() => ['E1']),
}));

jest.mock('../../../src/dot/generator', () => ({
  generateDotForActionPayload: jest.fn().mockResolvedValue(undefined),
}));

import fs from 'fs/promises';
import { generateAllFromJson, generateDotFilesFromPayload } from '../../../src/dot/main';
import type { GraphPayload } from '../../../src/dot/types';

test('generateAllFromJson reads json and writes all.dot', async () => {
  const fakePath = '/tmp/fake.json';
  (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ allActions: [], fromComponents: {}, fromEffects: {}, fromReducers: {} }));
  const out = await generateAllFromJson(fakePath, '/tmp/outdir2');
  expect(typeof out).toBe('string');
  expect((fs.mkdir as jest.Mock).mock.calls.length).toBeGreaterThan(0);
  expect((fs.writeFile as jest.Mock).mock.calls.length).toBeGreaterThan(0);
});

test('generateDotFilesFromPayload returns output dir when generating files for each action', async () => {
  const payload: GraphPayload = {
    allActions: [{ name: 'a1' }, { name: 'a2' }],
    fromComponents: {},
    fromEffects: {},
    fromReducers: {},
    loadedActions: [],
  };
  const out = await generateDotFilesFromPayload(payload, '/tmp/outdot');
  expect(out).toBe('/tmp/outdot');
  // ensure writeFile called for all.dot
  expect((fs.writeFile as jest.Mock).mock.calls.some(c => String(c[0]).endsWith('all.dot'))).toBeTruthy();
});
