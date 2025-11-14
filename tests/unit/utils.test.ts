import fs from 'fs/promises';
import { cleanupTempRoots, createTempDir } from '../helpers/utils';

test('createTempDir creates and cleanupTempRoots removes dirs', async () => {
  const d = await createTempDir('unit-test');
  const stat = await fs.stat(d);
  expect(stat.isDirectory()).toBe(true);
  await cleanupTempRoots();
  await new Promise(r => setTimeout(r, 50));
  await expect(fs.stat(d)).rejects.toThrow();
});
