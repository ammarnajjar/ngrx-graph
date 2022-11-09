# ngrx-graph

  # Usage

  <!-- usage -->
```sh-session
$ npm install -g ngrx-graph
$ ngrx-graph COMMAND
running command...
$ ngrx-graph (--version)
ngrx-graph/0.0.1-alpha.8 darwin-arm64 node-v19.0.0
$ ngrx-graph --help [COMMAND]
USAGE
  $ ngrx-graph COMMAND
...
```
<!-- usagestop -->

  # Commands

  <!-- commands -->
* [`ngrx-graph graph [ACTION]`](#ngrx-graph-graph-action)
* [`ngrx-graph help [COMMAND]`](#ngrx-graph-help-command)

## `ngrx-graph graph [ACTION]`

Generate NgRx actions graph

```
USAGE
  $ ngrx-graph graph [ACTION] [-f] [-a] [-d <value>] [-o <value>] [-s <value>]

ARGUMENTS
  ACTION  Action of interest

FLAGS
  -a, --all
  -d, --srcDir=<value>         [default: /Users/anajjar/code/ngrx-graph]
  -f, --force
  -o, --outputDir=<value>      [default: /tmp]
  -s, --structureFile=<value>  [default: ngrx-graph.json]

DESCRIPTION
  Generate NgRx actions graph

EXAMPLES
  $ ngrx-graph graph
```

_See code: [dist/commands/graph/index.ts](https://github.com/ammarnajjar/ngrx-graph/blob/v0.0.1-alpha.8/dist/commands/graph/index.ts)_

## `ngrx-graph help [COMMAND]`

Display help for ngrx-graph.

```
USAGE
  $ ngrx-graph help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for ngrx-graph.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.18/src/commands/help.ts)_
<!-- commandsstop -->
