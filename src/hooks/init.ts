import { spawnSync } from 'child_process';
import path from 'path';

export default async function init() {
  try {
    const argv = process.argv.slice(2);
    const hasHelp = argv.includes('--help') || argv.includes('-h');
    // If user asked for top-level help with no subcommand, delegate to the TypeScript CLI
    const hasCommand = argv.some(a => !a.startsWith('-'));
    if (hasHelp && !hasCommand) {
      const node = process.execPath || 'node';
      const cliPath = path.join(process.cwd(), 'src', 'cli.ts');
      const res = spawnSync(node, ['-r', 'ts-node/register', cliPath, '--help'], {stdio: 'inherit'});
      process.exit(res.status ?? 0);
    }
  } catch (err) {
    console.error('help-hook error', err);
  }
}
