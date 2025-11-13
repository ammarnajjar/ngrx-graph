import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const cliPath = path.join(root, 'src', 'cli.ts');
const cmdPath = path.join(root, 'src', 'commands', 'Symbol(SINGLE_COMMAND_CLI).ts');

const cli = fs.readFileSync(cliPath, 'utf8');
let cmd = fs.readFileSync(cmdPath, 'utf8');

// extract the addHelpText('after', `...`) block from cli.ts
const helpMatch = cli.match(/addHelpText\('after',\s*`([\s\S]*?)`\)\s*\.parse/);
if (!helpMatch) {
  console.error('could not find help block in src/cli.ts');
  process.exit(2);
}
const helpBlock = helpMatch[1].trim();

// extract Examples section lines that start with $ (shell examples)
const examplesSectionMatch = helpBlock.match(/Examples:\n\n([\s\S]*?)\n\nNotes:/);
let examples: string[] = [];
if (examplesSectionMatch) {
  const examplesText = examplesSectionMatch[1];
  examples = examplesText.split('\n').map(l => l.trim()).filter(l => l.startsWith('$'));
} else {
  examples = [helpBlock.split('\n').slice(0,3).join(' ')];
}

// prepare replacement strings
const examplesTs = `Graph.examples = [\n${examples.map(e => `  '${e.replace(/'/g, "\\'")}'`).join(',\n')}\n];\n\n`;
const appendedDesc = `\n\n${helpBlock.replace(/`/g, "\\`")}`;

// remove any existing Graph.examples or appended extra description marker
cmd = cmd.replace(/Graph\.examples\s*=\s*\[[\s\S]*?\];\n\n/, '');
cmd = cmd.replace(/\/\* SYNCHRONIZED_HELP_START \*\/[\s\S]*?\/\* SYNCHRONIZED_HELP_END \*\//, '');

// insert examples after description
if (cmd.includes("Graph.description")) {
  cmd = cmd.replace(/(Graph\.description\s*=\s*'[\s\S]*?';\n)/, `$1/* SYNCHRONIZED_HELP_START */\n${examplesTs}Graph.description += ` + "`" + appendedDesc + "`" + `;\n/* SYNCHRONIZED_HELP_END */\n`);
} else {
  console.error('could not find Graph.description in command shim');
  process.exit(2);
}

fs.writeFileSync(cmdPath, cmd, 'utf8');
console.log('synced examples from src/cli.ts -> src/commands/Symbol(SINGLE_COMMAND_CLI).ts');
