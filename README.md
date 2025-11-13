# ngrx-graph (scaffold)

This scaffold provides a CLI to parse an Angular NgRx project and generate a structure JSON and DOT graphs.

Usage examples:

Generate JSON and DOT for a single action:

  node ./dist/cli.js graph action1 -d docs/examples/case1/src -o /tmp/ngrx

JSON only:

  node ./dist/cli.js graph -j -d docs/examples/case1/src -o /tmp/ngrx

Generate a single combined DOT for the whole project:

  node ./dist/cli.js graph --all -d docs/examples/case1/src -o /tmp/ngrx
# ngrx-graph

CLI to scan an Angular NgRx codebase and generate DOT graphs and a structure JSON.

Usage examples:

Generate JSON and DOT for a single action:

  npx ngrx-graph graph action1 -d docs/examples/case1/src -o /tmp/ngrx

Generate JSON only:

  npx ngrx-graph graph -j -d docs/examples/case1/src -o /tmp/ngrx

Generate a single combined DOT for the whole project (written as `all.dot`):

  npx ngrx-graph graph --all -d docs/examples/case1/src -o /tmp/ngrx
# ngrx-graph (generated)

A small CLI to analyze an Angular project using NgRx and produce DOT graphs of actions, effects, components, and reducers.

Usage:

Generate structure JSON and DOT for specific action:

```bash
npx ngrx-graph graph action1 -d ./src -o ./out
```

Generate a single combined DOT (all actions/chains) written to `all.dot`:

```bash
npx ngrx-graph graph -a -d ./src -o ./out
```

Generate SVGs directly instead of DOT files:

```bash
# Generate a single action's SVG
npx ngrx-graph graph action1 -d ./src -o ./out --svg

# Generate SVGs for all actions
npx ngrx-graph graph -a -d ./src -o ./out --svg
```

Note: the `--svg` flag requires Graphviz's `dot` command to be available on your PATH (install via `brew install graphviz` on macOS).

Only generate JSON structure:

```bash
npx ngrx-graph graph -j -d ./src -o ./out
```

Run tests:

```bash
npm install
npm test
```
# ngrx-graph (generated)

Simple CLI to analyze an Angular project that uses NgRx and produce DOT graphs and a structure JSON.

Usage examples:

Generate JSON and DOT for an action:

  npx ngrx-graph graph action1 --srcDir ./docs/examples/case1/src --outputDir ./out

Generate JSON only:

  npx ngrx-graph graph --jsonOnly --srcDir ./docs/examples/case1/src --outputDir ./out

Generate a single combined DOT for the whole project (written to `all.dot`):

  npx ngrx-graph graph --all --srcDir ./docs/examples/case1/src --outputDir ./out

Run tests:

  npm test
# ngrx-graph

## Motivation:

Working with a very big [NgRx](https://ngrx.io/) store in an angular application will lead to having lots of actions/effects and lots of interactions between components/actions/reducers. It gets very tedious very quickly to follow an action from the start to the end, and it is very easy to miss an action dispatched in an effect somewhere along the chain of actions.

This package tries to collect all actions/components/reducers participating in a particular flow and generate dot files for that flow, with the idea that following a graph visually is easier than following effects and actions in code.

It is also possible to see the whole net with all actions/components/reducers, but that is more important is to follow a particular action from the start to the end (the optional argument)

## How it works

This package generates dot files representing the interaction between ngrx actions, components, effects and reducers.

Dot files can be then used to generate graphs using [Graphviz](https://www.graphviz.org/), so this needs to be installed first, e.g:

```bash
for file in *.dot; do; dot -Tsvg $file -o "${file%.*}".svg; rm $file; done
```

Alternatively a convenience script is provided to regenerate SVGs for the examples:

```bash
chmod +x scripts/gen-svgs.sh
./scripts/gen-svgs.sh
```

This script requires the `dot` command from Graphviz to be installed (macOS: `brew install graphviz`).

The first run will generate a json file (see `--structureFile` flag), which is used for the next runs if the flag `--force` was not set as cache.
If this file exists, source code will not be parsed for actions, the recorded structure will be taken from that json file. This speeds up the process considerably.

<details>
  <summary>Graph Keys</summary>

|                 |                                              |
| --------------- | -------------------------------------------- |
| Component       | ![component](./docs/keys/component.png)      |
| Action          | ![component](./docs/keys/action.png)         |
| Action in focus | ![component](./docs/keys/selectedAction.png) |
| Nested Action   | ![component](./docs/keys/nestedAction.png)   |
| Reducer         | ![component](./docs/keys/reducer.png)        |

</details>

Note: `--all` generates a single combined graph written to `all.dot`. Per-action DOT files (e.g. `action1.dot`) are only produced when you pass the action name as the positional argument, for example `npx ngrx-graph graph action1`.
<details>
  <summary>Examples</summary>

### Case 1:

### Input:

Input files (see the canonical example sources under `docs/examples/case1/src`):

- Actions: `docs/examples/case1/src/case1.actions.ts`
- Component: `docs/examples/case1/src/case1.component.ts`
- Effects: `docs/examples/case1/src/case1.effects.ts`
- Reducer: `docs/examples/case1/src/case1.reducer.ts`

### Output:

```bash
npx ngrx-graph -j -f
```

- [ngrx-graph.json](./docs/examples/case1/out/ngrx-graph.json)

```bash
npx ngrx-graph action1
```

- [dotFile](./docs/examples/case1/out/action1.dot)
- graph:  
  ![graph](./docs/examples/case1/out/action1.svg)

```bash
npx ngrx-graph action3
```

- [dotFile](./docs/examples/case1/out/action3.dot)
- graph:  
  ![graph](./docs/examples/case1/out/action3.svg)

### Case 2 (nested actions):

### Input:

Input files (see the canonical example sources under `docs/examples/case2/src`):

- Actions: `docs/examples/case2/src/case2.actions.ts`
- Component: `docs/examples/case2/src/case2.component.ts`
- Effects: `docs/examples/case2/src/case2.effects.ts`
- Reducer: `docs/examples/case2/src/case2.reducer.ts`

### Output:

```bash
npx ngrx-graph -j -f
```

- [ngrx-graph.json](./docs/examples/case2/out/ngrx-graph.json)

```bash
npx ngrx-graph action1
```

- [dotFile](./docs/examples/case2/out/action1.dot)
- graph:  
  ![graph](./docs/examples/case2/out/action1.svg)

```bash
npx ngrx-graph action3
```

- [dotFile](./docs/examples/case2/out/action3.dot)
- graph:  
  ![graph](./docs/examples/case2/out/action3.svg)

### Case 3 (reachability filtering):

### Input:

Input files (see the canonical example sources under `docs/examples/case3/src`):

- Actions: `docs/examples/case3/src/case3.actions.ts`
- Component: `docs/examples/case3/src/case3.component.ts`
- Effects: `docs/examples/case3/src/case3.effects.ts`
- Reducer: `docs/examples/case3/src/case3.reducer.ts`

### Output:

```bash
npx ngrx-graph -j -f
```

- [ngrx-graph.json](./docs/examples/case3/out/ngrx-graph.json)

```bash
npx ngrx-graph action1
```

- [dotFile](./docs/examples/case3/out/action1.dot)
- graph:  
  ![graph](./docs/examples/case3/out/action1.svg)

```bash
npx ngrx-graph action3
```

- [dotFile](./docs/examples/case3/out/action3.dot)
- graph:  
  ![graph](./docs/examples/case3/out/action3.svg)

```bash
npx ngrx-graph action2
```

- [dotFile](./docs/examples/case3/out/action2.dot)
- graph:  
  ![graph](./docs/examples/case3/out/action2.svg)

### Case 4 (aliases and re-exports):

### Input:

Input files (see the canonical example sources under `docs/examples/case4/src`):

- Actions: `docs/examples/case4/src/case4.actions.ts`
- Barrel / re-exports: `docs/examples/case4/src/index.ts`
- Component: `docs/examples/case4/src/case4.component.ts`
- Effects: `docs/examples/case4/src/case4.effects.ts`
- Reducer: `docs/examples/case4/src/case4.reducer.ts`

### Output:

```bash
npx ngrx-graph -j -f
```

- [ngrx-graph.json](./docs/examples/case4/out/ngrx-graph.json)

Generate a combined graph for the whole example:

```bash
npx ngrx-graph graph -a -d docs/examples/case4/src -o docs/examples/case4/out
```

- [combined DOT](./docs/examples/case4/out/all.dot)
- combined graph:  
  ![graph](./docs/examples/case4/out/all.svg)

Generate a graph for a specific action (produces per-action DOT only when an action is supplied):

```bash
npx ngrx-graph graph actionA -d docs/examples/case4/src -o docs/examples/case4/out
```

- [dotFile](./docs/examples/case4/out/actionA.dot)

</details>

<details>
  <summary>Usage</summary>

<!-- usage -->
```sh-session
$ npm install -g ngrx-graph
$ ngrx-graph COMMAND
running command...
$ ngrx-graph (--version)
ngrx-graph/0.0.14 darwin-arm64 node-v24.11.0
$ ngrx-graph --help [COMMAND]
USAGE
  $ ngrx-graph COMMAND
...
```
<!-- usagestop -->
</details>

<details>
  <summary>Commands</summary>

<!-- commands -->
* [`ngrx-graph graph`](#ngrx-graph-graph)
* [`ngrx-graph help [COMMAND]`](#ngrx-graph-help-command)

## `ngrx-graph graph`

Generate NgRx actions graph

```
USAGE
  $ ngrx-graph graph [-a] [-j] [-f] [-g] [-o <value>] [-d <value>] [-s <value>] [-c <value>] [-h]

FLAGS
  -a, --all
  -c, --highlightColor=<value>
  -d, --srcDir=<value>
  -f, --force
  -g, --svg                     also emit SVG files using Graphviz dot
  -h, --help                    Show CLI help.
  -j, --jsonOnly
  -o, --outputDir=<value>
  -s, --structureFile=<value>

DESCRIPTION
  Generate NgRx actions graph
```

_See code: [src/commands/graph/index.ts](https://github.com/ammarnajjar/ngrx-graph/blob/v0.0.14/src/commands/graph/index.ts)_

## `ngrx-graph help [COMMAND]`

Display help for ngrx-graph.

```
USAGE
  $ ngrx-graph help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for ngrx-graph.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.35/src/commands/help.ts)_
<!-- commandsstop -->
</details>

<details>
  <summary>Version Release Guide</summary>

  - change version in [`package.json`](package.json)
  - run `npm run version`
  - commit and push/merge to main
  - draft and release a release on [github](https://github.com/ammarnajjar/ngrx-graph/releases/new)
</details>

# Status:

This project is still young and it encourages collaborations. If you have an ideas/questions/fixes please do not hesitate to open an issue or provide a pull request.

I work on this on my own free time only.
