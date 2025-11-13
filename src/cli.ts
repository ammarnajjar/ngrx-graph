#!/usr/bin/env ts-node
import { spawnSync } from 'child_process';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import assemble from './assembler';
import generateDotFromJson, { generateDotAllFromJson } from './dot/fromJson';

function createProgram() {
  const program = new Command();

  program
    .name('ngrx-graph')
    .description('Generate NgRx actions graph')
    .helpOption('-h, --help', 'Display help for ngrx-graph')
    .argument('[action]', 'Action of interest')
    .option('-a, --all', 'Generate DOTs for all actions')
    .option('-d, --srcDir <dir>', 'Source directory to scan', process.cwd())
    .option('-o, --outputDir <dir>', 'Output directory', '/tmp')
    .option('-s, --structureFile <file>', 'Structure JSON filename', 'ngrx-graph.json')
    .option('-f, --force', 'Force regenerating the structure')
    .option('-j, --jsonOnly', 'Only generate JSON structure file')
    .option('--highlightColor <color>', 'Highlight color for selected action', '#007000')
    .option('--svg', 'Also generate SVG files from produced DOTs using Graphviz dot')
    .action(async (action: string | undefined, options) => {
      const srcDir = path.resolve(options.srcDir);
      const outputDir = path.resolve(options.outputDir);
      const structureFile = options.structureFile || 'ngrx-graph.json';
      const force = !!options.force;
      const jsonOnly = !!options.jsonOnly;
      const all = !!options.all;
      const highlightColor = options.highlightColor || '#007000';
      const emitSvg = !!options.svg;

      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      try {
  const struct = await assemble(srcDir, { force });

        // write structure JSON
        const structPath = path.join(outputDir, structureFile);
        await fs.promises.writeFile(structPath, JSON.stringify(struct, null, 2), 'utf8');
        console.log(`Wrote structure to ${structPath}`);

        if (jsonOnly) return;

  // decide which actions to generate
  const actionNames = struct.allActions.map(a => a.name as string);

        if (all) {
          // generate a single combined DOT for all actions
          const dot = generateDotAllFromJson(struct, { highlightAction: action, highlightColor });
          const outName = 'all.dot';
          const out = path.join(outputDir, outName);
          await fs.promises.writeFile(out, dot, 'utf8');
          console.log(`Wrote combined DOT -> ${out}`);
          if (emitSvg) {
            const svgPath = path.join(outputDir, `all.svg`);
            const res = spawnSync('dot', ['-Tsvg', '-o', svgPath], { input: dot, encoding: 'utf8' });
            if (res.error || res.status !== 0) console.error('Failed to generate SVG for all:', res.error || res.stderr?.toString());
            else console.log(`Wrote combined SVG -> ${svgPath}`);
          }
          return;
        }

        const target = action || actionNames[0];
        if (!target) {
          console.log('No actions found to generate DOT for.');
          return;
        }

        if (!actionNames.includes(target)) {
          console.warn(`Action '${target}' not found in project actions. Available: ${actionNames.join(', ')}`);
        }

        const dot = generateDotFromJson(struct, target, { highlightAction: target === action ? target : undefined, highlightColor });
        if (emitSvg) {
          const svgPath = path.join(outputDir, `${target}.svg`);
          const res = spawnSync('dot', ['-Tsvg', '-o', svgPath], { input: dot, encoding: 'utf8' });
          if (res.error || res.status !== 0) {
            console.error(`Failed to generate SVG for ${target}:`, res.error || res.stderr?.toString());
          } else {
            console.log(`Wrote SVG for ${target} -> ${svgPath}`);
          }
        } else {
          const out = path.join(outputDir, `${target}.dot`);
          await fs.promises.writeFile(out, dot, 'utf8');
          console.log(`Wrote DOT for ${target} -> ${out}`);
        }
      } catch (err) {
        console.error('Failed:', err);
        process.exitCode = 1;
      }
    });

  program.addHelpText('after', `
\nExamples:
  $ npx ngrx-graph graph action1 -d ./src -o ./out
  $ npx ngrx-graph graph --all -d ./src -o ./out --svg
  $ npx ngrx-graph graph --jsonOnly -d ./src -o ./out
`);

  return program;
}


export async function runCli(argv: string[]) {
  const p = createProgram();
  return p.parseAsync(argv, { from: 'user' });
}

export async function runGraph(action: string | undefined, options: {
  srcDir?: string;
  outputDir?: string;
  force?: boolean;
  jsonOnly?: boolean;
  all?: boolean;
  highlightColor?: string;
  svg?: boolean;
} = {}) {
  const srcDir = path.resolve(options.srcDir || process.cwd());
  const outputDir = path.resolve(options.outputDir || '/tmp');
  const structureFile = 'ngrx-graph.json';
  const force = !!options.force;
  const jsonOnly = !!options.jsonOnly;
  const all = !!options.all;
  const highlightColor = options.highlightColor || '#007000';
  const emitSvg = !!options.svg;

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const struct = await assemble(srcDir, { force });
  const structPath = path.join(outputDir, structureFile);
  await fs.promises.writeFile(structPath, JSON.stringify(struct, null, 2), 'utf8');

  if (jsonOnly) return { structure: struct, outputs: [] };

  const actionNames = struct.allActions.map(a => a.name as string);
  const outputs: string[] = [];

  if (all) {
    const dot = generateDotAllFromJson(struct, { highlightAction: action, highlightColor });
    const outName = 'all.dot';
    const out = path.join(outputDir, outName);
    await fs.promises.writeFile(out, dot, 'utf8');
    outputs.push(out);
    if (emitSvg) {
      const svgPath = path.join(outputDir, `all.svg`);
      spawnSync('dot', ['-Tsvg', '-o', svgPath], { input: dot, encoding: 'utf8' });
      outputs.push(svgPath);
    }
    return { structure: struct, outputs };
  }

  const target = action || actionNames[0];
  if (!target) return { structure: struct, outputs };

  const dot = generateDotFromJson(struct, target, { highlightAction: action === target ? target : undefined, highlightColor });
  const out = path.join(outputDir, `${target}.dot`);
  await fs.promises.writeFile(out, dot, 'utf8');
  outputs.push(out);
  if (emitSvg) {
    const svgPath = path.join(outputDir, `${target}.svg`);
    spawnSync('dot', ['-Tsvg', '-o', svgPath], { input: dot, encoding: 'utf8' });
    outputs.push(svgPath);
  }

  return { structure: struct, outputs };
}

// Backwards-compat default export: a program instance for direct require usage.
const defaultProgram = createProgram();

if (require.main === module) {
  defaultProgram.parse(process.argv);
}

export default defaultProgram;
