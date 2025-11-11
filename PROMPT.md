You can paste the following prompt into GitHub Copilot Chat to generate the core of the ngrx-graph TypeScript CLI.

---

You are to generate a complete, production-quality TypeScript CLI tool named ngrx-graph (MIT licensed) that parses an Angular + NgRx codebase to build a graph of interactions between components, actions, effects and reducers.

Requirements (condensed):
- oclif-based CLI: `ngrx-graph graph [ACTION?]` with flags: --all/-a, --jsonOnly/-j, --force/-f, --outputDir/-o, --srcDir/-d, --structureFile/-s.
- Parse TypeScript AST (TypeScript Compiler API) to find createAction, createEffect (with ofType), createReducer (with on(...)), and this.store.dispatch(...) in components. Support nested actions via props<{action: Action}>.
- Produce a JSON structure cache and DOT files. Reuse cache unless --force.
- Follow the directory architecture in the repository README: src/commands, discovery, graph, serialize, generate, utils, model/types.ts.
- Provide programmatic API: buildStructure, writeDotForAction, writeFullDot.
- Include unit tests (Jest + ts-jest) with fixtures: simple-case and nested-actions for parser/effect/reducer/component behavior; tests assert nodes/edges and DOT snapshots.
- Use TypeScript strict settings and include npm scripts for build/test/lint.

Files to generate (high-level):
- src/model/types.ts
- src/commands/graph/index.ts
- src/discovery/file-scanner.ts
- src/discovery/parser.ts
- src/graph/graph-builder.ts
- src/graph/subgraph.ts
- src/serialize/cache.ts
- src/generate/dot-writer.ts
- src/generate/graphviz-helpers.ts
- src/utils/log.ts
- test/* (parser.*.spec.ts, graph.*.spec.ts)
- test/fixtures/simple-case/* and nested-actions/*

Acceptance criteria for Copilot output:
1. Project compiles with `tsc -b` (TypeScript strict), and tests run with `jest` (ts-jest). If external Angular/NGRX typings are not available, test fixtures may declare minimal ambient functions so parser can run.
2. Parser uses TypeScript AST (no regex) to detect actions/effects/reducers/components and produces GraphStructure.
3. DOT writer produces a valid digraph with node styles matching README mapping.
4. Tests validate parser found expected nodes and edges and that extractSubgraph(action) returns reachable nodes/edges.

Additional notes for Copilot:
- Favor maintainable, small modules (<= ~300 lines each).
- For AST parsing edge-cases, add TODO comments and reasonable best-effort parsing (alias imports, simple nested payload patterns).
- Implement BFS/DFS for subgraph extraction.
- Add JSDoc comments for exported types/functions.

---

Files currently scaffolded in this workspace (partial implementation):
- src/model/types.ts - graph types
- src/config/defaults.ts - default flags
- src/utils/log.ts - simple logger
- src/discovery/file-scanner.ts - fast-glob based scanner
- src/discovery/parser.ts - simple AST parser (createAction/createEffect/createReducer/dispatch)
- src/graph/graph-builder.ts - normalize graph
- src/graph/subgraph.ts - BFS subgraph extractor
- src/serialize/cache.ts - read/write JSON structure
- src/generate/graphviz-helpers.ts - styling helper
- src/generate/dot-writer.ts - dot writer
- src/commands/graph/index.ts - oclif command (scaffold)
- test/fixtures/{simple-case,nested-actions} - fixtures
- test/*.spec.ts - some parser tests

Use the prompt above in Copilot to generate a more complete implementation or to flesh out edge-cases/tests.
PROMPT START

You are to generate a complete, production-quality TypeScript CLI tool named ngrx-graph (MIT licensed) that parses an Angular + NgRx codebase to build a graph of interactions between:
- Components (that dispatch actions through store.dispatch)
- NgRx actions (createAction(...) and nested actions that carry other actions in a payload)
- Effects (createEffect pipes listening via ofType, then emitting one or multiple actions)
- Reducers (createReducer + on(action,...))

The tool must:
1. Provide an oclif-based CLI command: ngrx-graph graph [ACTION?]
2. Flags (matching README semantics):
   - --all / -a: generate full graph (all actions + connected components/effects/reducers)
   - --jsonOnly / -j: only create structure JSON (no DOT files); ignores ACTION and --all
   - --force / -f: force regeneration (ignore cache)
   - --outputDir / -o <dir>: directory to write JSON and DOT files (default: /tmp)
   - --srcDir / -d <dir>: root source dir to scan (default: current working dir)
   - --structureFile / -s <name>: name of structure JSON file (default: ngrx-graph.json) saved under outputDir
3. Behavior:
   - First run: parse source, construct graph, save structure JSON (cache).
   - Subsequent runs (without --force): reuse JSON structure file (skip parsing) to speed execution.
   - Focused run with an ACTION argument: generate only the subgraph from that action through all reachable downstream actions/effects/reducers/components.
   - Nested actions: track when an action carries another action via props<{ action: Action }>(). Follow chains across nesting levels (arbitrary depth).
   - Effects that dispatch multiple actions (array form) or single actions. Handle operators: map, switchMap, mergeMap, concatMap, exhaustMap; treat any emission of Action or array of Actions as outgoing edges.
   - Reducers: each on(actionX, ...) introduces an edge from actionX to reducer node.
   - Components: detect dispatch calls this.store.dispatch(actionCreator()) or this.store.dispatch(nestedAction({ action: ... })). Edge from component to dispatched action.
   - Styling / DOT output:
     - Node categories: Component | Action | SelectedAction (focus) | NestedAction | Reducer.
     - Provide distinct shapes/colors consistent with README key (approximate visually; include comments for mapping).
   - Error handling: if focused ACTION not found, print clean error and exit with non-zero status code.
   - Graph algorithm: produce directional edges:
     - Component -> Action (dispatch)
     - Action -> Effect (if effect ofType includes the action)
     - Effect -> Action (actions emitted)
     - Action -> Reducer (if reducer handles it)
     - Action(parent) -> Action(nested) when nested via payload or nesting through effect emissions carrying nested actions.
4. Performance considerations:
   - Use TypeScript Compiler API to parse AST (no brittle regex).
   - Cache: store an object representing all discovered entities + edges in structureFile (JSON).
   - Avoid re-parsing when cache valid unless --force provided.
   - Support large codebases (thousands of files): use fast-glob for file discovery, parse only *.ts (exclude spec.ts, test files, node_modules).
5. Architecture (suggested structure):
   src/
     commands/graph/index.ts            // oclif command entry
     cli/output.ts                      // console formatting helpers
     config/defaults.ts                 // default flag values
     discovery/file-scanner.ts          // glob finder
     discovery/parser.ts                // AST parsing of actions, effects, reducers, components dispatch points
     model/types.ts                     // Graph interfaces
     graph/graph-builder.ts             // Build Edge/Node sets from parse artifacts
     graph/subgraph.ts                  // Extract focused subgraph for a given action
     graph/nesting.ts                   // Resolve nested action chains
     serialize/cache.ts                 // read/write structure JSON
     generate/dot-writer.ts             // DOT file creation with styling
     generate/graphviz-helpers.ts       // node formatting, escaping
     utils/ast-helpers.ts               // shared AST utilities
     utils/log.ts                       // structured logging
     index.ts                           // export main types & programmatic API
   test/
     parser.actions.spec.ts
     parser.effects.spec.ts
     parser.reducers.spec.ts
     parser.components.spec.ts
     parser.nested-actions.spec.ts
     graph.full.spec.ts
     graph.focused.spec.ts
     graph.cache.spec.ts
     graph.dot.spec.ts
     cli.flags.spec.ts
     cli.error-handling.spec.ts
6. Data model (define in model/types.ts):
   - enum NodeKind { Action, SelectedAction, NestedAction, Component, Effect, Reducer }
   - interface GraphNode { id: string; kind: NodeKind; name: string; file: string; line: number; meta?: Record<string, unknown>; }
   - interface GraphEdge { from: string; to: string; type: 'dispatch' | 'listen' | 'emit' | 'handle' | 'nest'; }
   - interface GraphStructure { nodes: GraphNode[]; edges: GraphEdge[]; generatedAt: string; version: string; }
7. Parsing specifics:
   Actions:
     - createAction('ActionName' [, props<...>()])
     - Support imported alias usage e.g., import { createAction as ca }.
   Nested actions:
     - props<{ action: Action }>() marks an action that wraps another action; treat payload usage accordingly.
     - Detect dispatch(nestedAction({ action: someAction() })) => Edge: nestedAction -> someAction AND component -> nestedAction.
   Effects:
     - Find class members assigned: createEffect(() => this.actions$.pipe(...))
     - Inside pipe: ofType(a1, a2, ...) associates effect with those actions (edges: action -> effect).
     - After ofType, detect operators emitting actions:
       - map(...) returning actionCreator()
       - switchMap / mergeMap / concatMap / exhaustMap returning [a1(), a2()] or array literal of actions
       - Pluck nestedAction payload where payload.action() is invoked.
   Reducers:
     - createReducer(initialState?, on(actionX, ...), on(actionY, ...))
     - Each on: actionX -> reducer edge.
   Components:
     - Class annotated with @Component(...) (no need to parse decorator args deeply).
     - Methods containing this.store.dispatch(actionCreator()).
     - Provide edge component -> actionCreator.
   Defensive parsing:
     - Handle re-exported actions (export { action1 } from './path').
     - Track imported symbols and alias mapping.
     - Skip ambiguous dynamic dispatches (e.g., this.store.dispatch(someVar)). Do not attempt runtime inference.
8. DOT generation:
   - Graph is directed: digraph G { ... }
   - Node styling suggestions:
     - Action: shape=ellipse, fillcolor=lightgoldenrod1
     - SelectedAction: shape=doublecircle, fillcolor=gold
     - NestedAction: shape=ellipse, fillcolor=lightskyblue
     - Component: shape=box, fillcolor=lightgreen
     - Effect: shape=diamond, fillcolor=lightpink
     - Reducer: shape=hexagon, fillcolor=lightgray
   - Edges labeled by type (dispatch, listen, emit, handle, nest) with distinct colors.
   - Escape identifiers and quotes safely.
9. Focused graph extraction:
   - Given an ACTION name:
     - Mark that node as SelectedAction.
     - Traverse forward along edges emit|handle|nest|dispatch|listen to include reachable nodes.
     - Optionally (if simple) include backward context of components/effects that lead to it (but not required unless trivial).
10. Programmatic API (index.ts):
   - export functions:
     - buildStructure(options): Promise<GraphStructure>
     - writeDotForAction(structure, actionName, outputDir)
     - writeFullDot(structure, outputDir)
11. CLI flow (graph command):
   - Resolve flags
   - Load or build structure (cache logic)
   - If --jsonOnly: write structure JSON and exit
   - If ACTION provided: generate DOT for subgraph of ACTION
   - If --all: generate DOT for full graph
   - Default with no ACTION and no flags: same as dot for full graph?
   - Print paths of generated files
12. Logging: minimal, with verbose mode optionally (not required if scope too big—skip if not needed).
13. Edge cases to cover in tests:
   - Multiple actions listened by same effect (ofType(action1, action2))
   - Effect returning array of actions
   - Nested action three levels deep (nestedAction(action: nestedAction2(action: action3())))
   - Missing focused action => clean error
   - Cache reuse vs --force
   - Aliased imports of createAction / createReducer / createEffect
   - Component dispatches two different actions in different methods
14. Jest test strategy:
   - Use in-memory fixture sources (write temporary files under a temp dir) for parser tests.
   - Snapshot DOT output for simple cases (strip timestamps).
   - Mock filesystem for cache tests (or use a temp directory).
   - Ensure 80%+ coverage focusing on logic (no need for exhaustive AST edge cases beyond described).
15. Coding standards:
   - Target Node >=16.
   - Strict TypeScript (tsconfig strict true).
   - Avoid any external heavy parsing libs beyond TypeScript.
   - No reliance on Angular packages; treat source code textually via AST nodes.
16. Provide a README segment update (but don’t overwrite existing README here) in comments inside code referencing usage examples.
17. Do NOT include contrived placeholder functions—implement real logic.
18. All exported public types must be documented with JSDoc.
19. Ensure build: tsc -b passes; tests: jest (with ts-jest) pass.
20. Provide lightweight utility functions; keep files focused and under ~300 lines each where feasible.
21. Include npm script suggestions in package.json (if absent):
   - "build": "tsc -b"
   - "test": "jest"
   - "lint": "eslint . --ext .ts"
22. MIT license header in new source files.

Now generate:
- All source files listed
- Tests with meaningful assertions (not only existence)
- Updated package.json additions if missing (but preserve existing fields)
- Any necessary tsconfig adjustments (strict mode)
- Jest config (ts-jest) if not already present
- A sample fixture directory under test/fixtures with at least:
  - simple-case/
  - nested-actions/
- Implement graph traversal in subgraph.ts using BFS/DFS over edges.

Stop after producing code + tests (no need to run commands). Provide a summary of files and their purpose at the end.

PROMPT END