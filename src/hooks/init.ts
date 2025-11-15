import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export default async function init() {
  try {
    const argv = process.argv.slice(2);
    const hasHelp = argv.includes('--help') || argv.includes('-h');
    const hasCommand = argv.some(a => !a.startsWith('-'));
    if (hasHelp && !hasCommand) {
      const node = process.execPath || 'node';

      let cur = __dirname;
      const root = path.parse(cur).root;
      let projectRoot = cur;
      while (true) {
        if (fs.existsSync(path.join(cur, 'package.json')) || fs.existsSync(path.join(cur, 'tsconfig.json'))) {
          projectRoot = cur;
          break;
        }
        if (cur === root) break;
        cur = path.dirname(cur);
      }

      const cliPath = path.join(projectRoot, 'src', 'cli.ts');

      let tsNodeRegister = 'ts-node/register';
      try {
        tsNodeRegister = require.resolve('ts-node/register', { paths: [projectRoot] });
      } catch {
        // fallback
      }

      const res = spawnSync(node, ['-r', tsNodeRegister, cliPath, '--help'], { stdio: 'inherit', cwd: projectRoot });
      process.exit(res.status ?? 0);
    }
  } catch (err) {
    console.error('help-hook error', err);
  }
}
