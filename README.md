# ngrx-graph

**Status: WIP**

Generate dot files representing the interaction between ngrx actions, components, effects and reducers.

Dot files can be then used to generate graphs using [Graphviz](https://www.graphviz.org/), e.g:

```bash
for file in *.dot; do; dot -Tsvg $file -o "${file%.*}".svg; rm $file; done
```

  # Usage

  <!-- usage -->
```sh-session
$ npm install -g ngrx-graph
$ ngrx-graph COMMAND
running command...
$ ngrx-graph (--version)
ngrx-graph/0.0.1-alpha.10 darwin-arm64 node-v19.0.0
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
  $ ngrx-graph graph [ACTION] [-f] [-j] [-a] [-d <value>] [-o <value>] [-s <value>]

ARGUMENTS
  ACTION  Action of interest. It will be ignored if --jsonOnly is used

FLAGS
  -a, --all                    Generate the whole graph for all actions and connected component, effects and reducers.
                               It will be ignored if --jsonOnly is used
  -d, --srcDir=<value>         [default: /Users/anajjar/code/ngrx-graph] Source directory to grab actions from, usually
                               the directory with package.json in it
  -f, --force                  Force regenrating the graph structure
  -j, --jsonOnly               Generate only the structure json file, can be combined with --structureFile option. It
                               overrides --all and [ACTION]
  -o, --outputDir=<value>      [default: /tmp] Destination directory, where to save the generated files
  -s, --structureFile=<value>  [default: ngrx-graph.json] Then name of the structure json file, Path is taken from
                               --outputDir option

DESCRIPTION
  Generate NgRx actions graph

EXAMPLES
  $ ngrx-graph graph
```

_See code: [dist/commands/graph/index.ts](https://github.com/ammarnajjar/ngrx-graph/blob/v0.0.1-alpha.10/dist/commands/graph/index.ts)_

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
