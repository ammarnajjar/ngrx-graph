/* eslint-env node */
/* eslint-disable no-undef */
import fs from 'fs';
import path from 'path';

if (process.argv.length < 3) {
  console.error('Usage: node scripts/compare_example.js <caseDir>');
  process.exit(2);
}
const caseDir = process.argv[2];
const outDir = path.join(caseDir, 'out');
const genFile = path.join(outDir, 'ngrx-graph.generated.json');
const expFile = path.join(outDir, 'ngrx-graph.json');
if (!fs.existsSync(genFile)) { console.error('Generated file not found:', genFile); process.exit(3); }
if (!fs.existsSync(expFile)) { console.error('Expected file not found:', expFile); process.exit(3); }
const gen = JSON.parse(fs.readFileSync(genFile,'utf8')).allActions.map((a) => a.name).sort();
const exp = JSON.parse(fs.readFileSync(expFile,'utf8')).allActions.map((a) => a.name).sort();
const missing = exp.filter((x) => !gen.includes(x));
const extra = gen.filter((x) => !exp.includes(x));
fs.writeFileSync(path.join(outDir,'missing.json'), JSON.stringify(missing,null,2));
fs.writeFileSync(path.join(outDir,'extra.json'), JSON.stringify(extra,null,2));
console.log('Case:', caseDir);
console.log('generated', gen.length, 'expected', exp.length, 'missing', missing.length, 'extra', extra.length);
if (missing.length) console.log(' missing sample:', missing.slice(0,10));
if (extra.length) console.log(' extra sample:', extra.slice(0,10));
