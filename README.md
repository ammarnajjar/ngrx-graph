# ngrx-graph

  # Usage

  <!-- usage -->
```sh-session
$ npm install -g ngrx-graph
$ xrgn COMMAND
running command...
$ xrgn (--version)
ngrx-graph/0.0.0 darwin-arm64 node-v19.0.0
$ xrgn --help [COMMAND]
USAGE
  $ xrgn COMMAND
...
```
<!-- usagestop -->

  # Commands

  <!-- commands -->
* [`xrgn graph [ACTION]`](#xrgn-graph-action)
* [`xrgn help [COMMAND]`](#xrgn-help-command)
* [`xrgn plugins`](#xrgn-plugins)
* [`xrgn plugins:install PLUGIN...`](#xrgn-pluginsinstall-plugin)
* [`xrgn plugins:inspect PLUGIN...`](#xrgn-pluginsinspect-plugin)
* [`xrgn plugins:install PLUGIN...`](#xrgn-pluginsinstall-plugin-1)
* [`xrgn plugins:link PLUGIN`](#xrgn-pluginslink-plugin)
* [`xrgn plugins:uninstall PLUGIN...`](#xrgn-pluginsuninstall-plugin)
* [`xrgn plugins:uninstall PLUGIN...`](#xrgn-pluginsuninstall-plugin-1)
* [`xrgn plugins:uninstall PLUGIN...`](#xrgn-pluginsuninstall-plugin-2)
* [`xrgn plugins update`](#xrgn-plugins-update)

## `xrgn graph [ACTION]`

Generate NgRx actions graph

```
USAGE
  $ xrgn graph [ACTION] [-f] [-a] [-d <value>] [-o <value>] [-s <value>]

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
  $ xrgn graph
```

_See code: [dist/commands/graph/index.ts](https://github.com/ammarnajjar/ngrx-graph/blob/v0.0.0/dist/commands/graph/index.ts)_

## `xrgn help [COMMAND]`

Display help for xrgn.

```
USAGE
  $ xrgn help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for xrgn.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.16/src/commands/help.ts)_

## `xrgn plugins`

List installed plugins.

```
USAGE
  $ xrgn plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ xrgn plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.5/src/commands/plugins/index.ts)_

## `xrgn plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ xrgn plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ xrgn plugins add

EXAMPLES
  $ xrgn plugins:install myplugin

  $ xrgn plugins:install https://github.com/someuser/someplugin

  $ xrgn plugins:install someuser/someplugin
```

## `xrgn plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ xrgn plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ xrgn plugins:inspect myplugin
```

## `xrgn plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ xrgn plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ xrgn plugins add

EXAMPLES
  $ xrgn plugins:install myplugin

  $ xrgn plugins:install https://github.com/someuser/someplugin

  $ xrgn plugins:install someuser/someplugin
```

## `xrgn plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ xrgn plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ xrgn plugins:link myplugin
```

## `xrgn plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ xrgn plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ xrgn plugins unlink
  $ xrgn plugins remove
```

## `xrgn plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ xrgn plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ xrgn plugins unlink
  $ xrgn plugins remove
```

## `xrgn plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ xrgn plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ xrgn plugins unlink
  $ xrgn plugins remove
```

## `xrgn plugins update`

Update installed plugins.

```
USAGE
  $ xrgn plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```
<!-- commandsstop -->
