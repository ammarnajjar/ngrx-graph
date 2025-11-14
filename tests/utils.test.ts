import fs from 'fs/promises';
import path from 'path';
import { createTempDir, cleanupTempRoots } from './utils';

jest.setTimeout(10000);

test('createTempDir creates and cleanupTempRoots removes dirs', async () => {
  const d = await createTempDir('unit-test');
  const stat = await fs.stat(d);
  expect(stat.isDirectory()).toBe(true);
  // cleanup and assert directory removed
  await cleanupTempRoots();
  // allow some time for removal
  await new Promise(r => setTimeout(r, 50));
  await expect(fs.stat(d)).rejects.toThrow();
});
