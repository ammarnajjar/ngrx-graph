import fs from 'fs';
import os from 'os';
import path from 'path';
import { quickActionsFromFiles } from '../src/parser/quickActions';

describe('quickActionsFromFiles', () => {
  it('maps exported createAction identifiers to files and labels', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-'));
    const fileA = path.join(tmp, 'a.actions.ts');
    const fileB = path.join(tmp, 'b.actions.ts');

    fs.writeFileSync(
      fileA,
      `import { createAction } from '@ngrx/store';\nexport const doThing = createAction('[A] Do thing');\nexport const other = createAction('[A] Other');\n`
    );

    fs.writeFileSync(
      fileB,
      `import { createAction } from '@ngrx/store';\nconst hidden = createAction('[B] Hidden');\nexport const exposed = createAction('[B] Exposed');\n`
    );

    const res = quickActionsFromFiles([fileA, fileB]);
    expect(res.doThing).toBeDefined();
    expect(res.doThing.file).toContain('a.actions.ts');
    expect(res.doThing.label).toBe('[A] Do thing');

    expect(res.other).toBeDefined();
    expect(res.exposed).toBeDefined();
    // Hidden unlabeled action should be present keyed by its label if no export
    expect(res['[B] Hidden']).toBeDefined();
  });
});
