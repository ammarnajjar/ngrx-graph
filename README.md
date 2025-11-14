# ngrx-graph

CLI to scan an Angular NgRx codebase and produce a structure JSON and DOT/SVG graphs.

## Motivation:

Working with a very big [NgRx](https://ngrx.io/) store in an angular application will lead to having lots of actions/effects and lots of interactions between components/actions/reducers. It gets very tedious very quickly to follow an action from the start to the end, and it is very easy to miss an action dispatched in an effect somewhere along the chain of actions.

This package tries to collect all actions/components/reducers participating in a particular flow and generate dot files for that flow, with the idea that following a graph visually is easier than following effects and actions in code.

It is also possible to see the whole net with all actions/components/reducers, but that is more important is to follow a particular action from the start to the end (the optional argument)

Quick start
-----------

Install (optional):

```bash
npm install -g ngrx-graph
# or use npx: npx ngrx-graph ...
```

Basic usage examples:

- Generate the structure JSON (always written to `--out`, default `ngrx-graph.json`):

```bash
ngrx-graph -d ./src --out ./out    # writes ./out/ngrx-graph.json
```

- Generate an action-focused DOT (and optional SVG) for a specific action:

```bash
ngrx-graph "MyAction" -d ./src --out ./out --dot --svg
```

- Generate a single aggregated DOT for the whole project (writes `all.dot`):

```bash
ngrx-graph -a -d ./src --out ./out --dot --svg
```

-- Re-generate the JSON (use `--json` alone to stop after JSON):

```bash
ngrx-graph -d ./src --out ./out --json
```

Reuse existing JSON instead of re-scanning:

```bash
ngrx-graph -d ./src --out ./out --cache
```

Short flags: `-d/--dir`, `-o/--out (directory)`, `-a/--all`, `-s/--svg`, `-j/--json`, `-v/--verbose`, `-c/--concurrency`, `--cache`

Notes
-----

- The CLI always writes the JSON payload to the file specified by `--out` (default: `ngrx-graph.json`).
- DOT and SVG files are written under the directory specified by `--dir`.
- DOT files are generated only when `--dot` or `--svg` is passed. Use `--json` to re-generate the JSON first; combine with `--dot`/`--svg` to continue generating DOT/SVG.


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
npx ngrx-graph -f
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
npx ngrx-graph -f
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
npx ngrx-graph -f
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
npx ngrx-graph -f
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
* [`ngrx-graph help [COMMAND]`](#ngrx-graph-help-command)

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
