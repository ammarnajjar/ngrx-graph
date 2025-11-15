import fs from 'fs/promises';
import path from 'path';
import { parseActionsFromText } from '../../../src/scan/actions';

test('detect aliased re-export from index.ts (case4)', async () => {
  const base = path.join(process.cwd(), 'docs', 'examples', 'case4', 'src');
  const indexPath = path.join(base, 'index.ts');
  const actionsPath = path.join(base, 'case4.actions.ts');

  const indexTxt = await fs.readFile(indexPath, 'utf8');
  const actionsTxt = await fs.readFile(actionsPath, 'utf8');

  // parse the actions file directly
  const direct = await parseActionsFromText(actionsTxt, actionsPath);
  expect(direct.some(a => a.name === 'actionA')).toBeTruthy();

  // parse the index (which re-exports actionA as exportedActionA)
  const aliased = await parseActionsFromText(indexTxt, indexPath);
  // should include an entry named exportedActionA and attribute file to index.ts
  expect(aliased.some(a => a.name === 'exportedActionA' && a.file === indexPath)).toBeTruthy();

  // also ensure actionB re-export is detected
  expect(aliased.some(a => a.name === 'actionB')).toBeTruthy();
});
