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

      // find project root by walking up from this file until we find package.json or tsconfig.json
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

      // Prefer project-local ts-node/register to ensure the preload resolves
      // from the project node_modules directory when running from elsewhere.
      let tsNodeRegister = 'ts-node/register';
      try {
        tsNodeRegister = require.resolve('ts-node/register', { paths: [projectRoot] });
      } catch {
        // fall back to bare name
      }

      const res = spawnSync(node, ['-r', tsNodeRegister, cliPath, '--help'], { stdio: 'inherit', cwd: projectRoot });
      process.exit(res.status ?? 0);
    }
  } catch (err) {
    console.error('help-hook error', err);
  }
}
