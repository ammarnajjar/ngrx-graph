# ngrx-graph

## Motivation:

Working with a very big [NgRx](https://ngrx.io/) store in an angular application will lead to having lots of actions/effects and lots of interactions betwen components/actions/reducers. It gets very tedious very quickly to follow an action from the start to the end, and it is very easy to miss an action dispatched in an effect somewhere along the chain of actions.

This packages, tries to collect all actions/components/reducers participating in a particular flow and generate dot files for that flow, with the idea that following a graph visually is easier than following effects and actions in code.

It is also possible to see the whole net with all actions/components/reducers, but that is more important is to follow a particular action from the start to the end (the optional argument)

## How it works

This package generates dot files representing the interaction between ngrx actions, components, effects and reducers.

Dot files can be then used to generate graphs using [Graphviz](https://www.graphviz.org/), so this needs to be installed first, e.g:

```bash
for file in *.dot; do; dot -Tsvg $file -o "${file%.*}".svg; rm $file; done
```

## Example

```bash
npx ngrx-graph MainAction
```

Generates: [dot file](.//docs/example.dot) (I took a real world example and anonymised the names)

Produced graph will look like:

![example generated graph](./docs/example.svg)

# Usage

  <!-- usage -->

```sh-session
$ npm install -g ngrx-graph
$ ngrx-graph COMMAND
running command...
$ ngrx-graph (--version)
ngrx-graph/0.0.3 darwin-arm64 node-v19.0.1
$ ngrx-graph --help [COMMAND]
USAGE
  $ ngrx-graph COMMAND
...
```

<!-- usagestop -->

# Commands

  <!-- commands -->

- [`ngrx-graph graph [ACTION]`](#ngrx-graph-graph-action)
- [`ngrx-graph help [COMMAND]`](#ngrx-graph-help-command)

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
  -d, --srcDir=<value>         [default: current directory] Source directory to grab actions from, usually the directory
                               with package.json in it
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

_See code: [dist/commands/graph/index.ts](https://github.com/ammarnajjar/ngrx-graph/blob/v0.0.3/dist/commands/graph/index.ts)_

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

# Status:

This project is still young and encourage collaborations. If you have an ideas/questions/fixes please do not hesitate to open an issue or provide a pull request.

I work on this on my own free time only.
