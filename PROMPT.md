You are GitHub Copilot. Generate a TypeScript CLI project that scans an Angular project using NgRx and produces DOT graph files showing relationships between Components, Actions, Effects, and Reducers. Also generate unit tests (Jest) and a small README with commands. Follow the exact specs, output formats, and examples below so generated artifacts match the examples in examples in this repository.

Top-level goal
- Parse TypeScript source in an Angular project to discover:
  - exported action creators (from `createAction`, possibly with `props`),
  - components that dispatch actions (calls to `store.dispatch(...)` or `this.store.dispatch(...)`),
  - effects that listen (via `ofType(...)`) and which actions they output (map/switchMap/mergeMap returning Action(s)),
  - reducers that `on(action, ...)`.
- Produce:
  - a JSON structure file describing actions and relationships (schema shown below),
  - one DOT file per action chosen (or entire graph if `--all`) showing nodes and relationships,
  - DOT graphs must visually distinguish:
    - components (shape and color),
    - actions (shape and color),
    - selected action (distinct highlight color),
    - nested actions (an action held inside props<Action>),
    - reducers.
- Support recursion: when user asks for a specific action, the tool should follow where that action flows (components that dispatch it -> effects triggered by it -> actions those effects output -> effects triggered by those -> ... -> reducers that handle some actions).
- Selected action nodes must be visually distinct (e.g., filled color + bold border).
- Use AST parsing from typescript and do not use regex parsing

Acceptance criteria / tests
- When parsing `docs/examples/case1/src/*` the JSON produced must equal the project's ngrx-graph.json (or equivalent structure as described below).
- When running `npx ngrx-graph graph action1` (or equivalent CLI) the generated DOT for `action1` must match the structure represented in action1.dot (use structure in `case1` as canonical fixture).
- Include Jest tests that validate:
  - parsing of actions/components/effects/reducers (happy path using case1),
  - nested action detection (use case2),
  - CLI flag behavior: `--jsonOnly`, `--force`, `--all`.
- Provide package.json scripts: `build`, test, `start` (or `cli`), and `lint` if included.

Contract (tiny)
- Inputs:
  - `srcDir` (default current directory) - path to project's source to analyze (TypeScript).
  - `action` CLI arg (optional) - name of the action to focus on.
  - flags: `--all`, `--jsonOnly`, `--force`, `--outputDir`, `--structureFile`.
- Outputs:
  - `structure.json` (default name ngrx-graph.json in `--outputDir`) - described schema below.
  - DOT files in `--outputDir` (one per action when not `--all`).
- Error modes:
  - invalid `srcDir`: non-zero exit and user-friendly message,
  - no actions found: return structure.json with empty arrays and a message,
  - AST parse error: show file and location and continue where possible.

Data shapes / structure JSON (strict)
Produce JSON with these keys (example shown below exactly matches this shape):

{
  "allActions": [ { "name": string, "nested": boolean }, ... ],
  "loadedActions": [ /* optional runtime-loaded action names, may be empty */ ],
  "fromComponents": { "<ComponentName>": ["actionName", ...], ... },
  "fromEffects": {
    "<EffectPropertyName>": { "input": ["actionName", ...], "output": ["actionName", ...] },
    ...
  },
  "fromReducers": { "<ReducerName>": ["actionName", ...], ... }
}

- `allActions`: list of all created action names; `nested: true` means this action is typically used as a nested property (e.g., `props<{ action: Action }>()`) or created to wrap another action.
- `fromComponents`: map of component class name to action names they dispatch.
- `fromEffects`: map of effect property name to object listing `input` actions (ofType args) and `output` actions (what the effect returns/emits).
- `fromReducers`: map of reducer constant/function name to actions it handles via `on(...)`.

Examples (canonical fixtures)
- Use the existing files under src and src as fixtures.
- The expected ngrx-graph.json is shown in the repo — generate identical shape for the `case1` sources.
- Ensure nested-case logic reproduces `case2` outputs.

CLI specification
- Top-level command: `ngrx-graph graph [ACTION]`
- Flags:
  - `-a, --all` — generate the whole graph for all actions and connected components/effects/reducers.
  - `-d, --srcDir <value>` — [default: current directory] Source directory to parse.
  - `-f, --force` — Force regenerating (ignore cached `--structureFile`).
  - `-j, --jsonOnly` — Generate only the structure JSON (and exit).
  - `-o, --outputDir <value>` — [default: /tmp] Where to save JSON and DOT output.
  - `-s, --structureFile <value>` — [default: ngrx-graph.json] Name of the structure JSON.
- Behavior:
  - On first run or when `--force`, parse TS sources, write structure JSON.
  - If not `--force` and `--structureFile` exists in `--outputDir`, load it and skip parsing.
  - If `--jsonOnly`, only write JSON and exit.
  - If ACTION arg provided, generate a DOT for that action and all reachable nodes as described; otherwise generate DOT(s) based on `--all`.

Traversal & recursion rules
- Start nodes:
  - Components that dispatch actions: edges `Component -> Action` (dispatch).
- For a selected action A:
  - Find all effects that `ofType(A)` (or `ofType(actionCreator)` referencing the action) -> each effect yields output action(s) B -> continue recursively for each output action.
  - If an action is emitted as a nested action inside a props field (e.g., `nestedAction({ action: action1() })`) treat `nestedAction` as `nested: true` and also follow the inner `action1` (so that nested chains get expanded).
  - Stop recursion when no effects produce further actions, or when an action has been visited already (avoid cycles).
- For reducers:
  - Edges `Action -> Reducer` (reducer `on(action, ...)`).
- For effects outputting arrays (like `switchMap(() => [action2(), action3()])`) or single action return (`map(() => action2())`) detect both.
- For nested actions created with `props<{ action: Action }>()` or similar, find the inner `action` usage and mark the wrapper action as nested.

DOT styling (recommendation, must be implemented)
- Use Graphviz DOT format.
- Node types:
  - Component: shape=box, fillcolor="#BFD8FF", style=filled, color="#3B82F6"
  - Action: shape=ellipse, fillcolor="#FFF7BF", style=filled, color="#D97706"
  - Nested Action: shape=ellipse, fillcolor="#FDEDE8", style=filled, color="#EF4444", per-node label suffix "(nested)"
  - Reducer: shape=folder or note, fillcolor="#D7F5E9", style=filled, color="#059669"
  - Selected Action: use a strong highlight: penwidth=3, fillcolor="#FFD6D6", color="#EF4444", style="filled,bold"
- Edge labels:
  - Component -> Action: label="dispatch"
  - Action -> Effect: label="triggers"
  - Effect -> Action: label="outputs"
  - Action -> Reducer: label="handled"
- Example snippet for a selected action node:
  A1 [label="action1", shape=ellipse, style="filled,bold", fillcolor="#FFD6D6", color="#B91C1C", penwidth=3];

Parsing strategy and recommended libraries
- Use TypeScript AST via `ts-morph` (recommended) or the TypeScript Compiler API directly. Rationale: Type information, ES module resolution, and easier traversal. Use a Project with the correct tsconfig.json.
- Key parser responsibilities:
  - find calls to `createAction(...)` and record exported const variable name -> action name (use the variable identifier as canonical `name` in `allActions`).
  - find `props<{ action: Action }>()` usage to detect nested actions (mark `nested: true` if props contains an Action type).
  - find class declarations with `@Component` decorator and inside methods or lifecycle hooks detect `this.store.dispatch(X())` or `store.dispatch(X())` (imported `Store` usage).
  - find `createEffect` properties inside classes decorated with `@Injectable` and analyze the inner pipe to get `ofType(...)` input actions and the output actions returned in `map/switchMap/mergeMap/concatMap` callbacks (both arrays and single returns).
  - find `createReducer` + `on(...)` to map reducers to handled actions.
- Carefully resolve references to action creators imported from other files (handle import declarations).
- For cases where action creators are invoked with parentheses `action1()` or `action1({})`, detect that as an action instance.

Project layout (suggested files to generate)
- src/
  - cli.ts — CLI entry (use `commander` or `oclif` or simple Node arg parser).
  - index.ts — main exported helpers.
  - parser.ts — AST parsing logic (ts-morph).
  - graph.ts — DOT generation logic.
  - jsonCache.ts — read/write `structureFile` handling.
  - types.ts — Types for the structure JSON, node/edge interfaces.
  - utils/* — small helpers for AST traversal, import resolution.
- tests/
  - fixtures/case1/* (re-use case1 or copy small fixtures)
  - parser.spec.ts — unit tests for AST parser using fixture files.
  - graph.spec.ts — unit tests for DOT generation for a specific action using fixture structure JSON.
  - cli.spec.ts — test CLI flag behavior (spawn or import CLI module).
- package.json — scripts `build`, test, `start` (bin mapping), dependencies:
  - dependencies: `ts-morph`, `commander` (or `oclif` if you want), `graphviz` not required as runtime,
  - devDependencies: `typescript`, `jest`, `ts-jest`, `@types/jest`, `eslint` (optional).
- README.md — short usage snippet.

Unit Tests (explicit)
- Test 1: parse src and assert JSON equals ngrx-graph.json.
  - Load fixture files via the ts-morph Project root override or use path to src.
  - Assert `structure.allActions` contains `action1, action2, action3` with `nested:false`.
  - Assert `fromComponents.FirstComponent` contains `action1`.
  - Assert `fromEffects.effect1$.input` contains `action1` and `output` contains `action2, action3`.
  - Assert `fromReducers.firstReducer` contains `action3`.
- Test 2: parse src and validate nested action detection:
  - `allActions` includes `nestedAction`, `action1`, `action2`, `action3`.
  - `nestedAction` should appear with `nested:true`.
  - Validate recursion detection in a small simulated traversal (action1 triggers nestedAction => inner action1).
- Test 3: DOT generation for `action1` (case1)
  - Using the structure JSON from Test 1, generate DOT for `action1` and assert:
    - the DOT contains a node for `FirstComponent` and `action1`, `action2`, `action3`.
    - edges exist: `FirstComponent -> action1`, `effect1$ -> action2`, `effect1$ -> action3`, `action3 -> firstReducer`.
    - The `action1` node contains attributes marking it as selected (the highlight attributes).
- Test 4 (CLI flags): simulate `--jsonOnly` and ensure only JSON file is created.
- (Optional) Test 5: cycle detection - create synthetic fixtures where effects cause cycles and assert traversal stops without infinite loop.

Edge cases to handle
- Actions imported under different names (alias imports).
- Effects that return Observables of actions besides simple arrays: e.g., `switchMap(() => of(action1()))`.
- Multiple `ofType` arguments in a single effect.
- Nested action payloads with more than one field; find `Action`-typed fields.
- Action creators with typed payloads (props) that include other complex types.
- Reducers defined inline or exported as const.

Implementation notes & hints for Copilot
- Use `ts-morph` Project to load source files from `--srcDir` and set compiler options reading tsconfig.json if present.
- When resolving imports, prefer `node` module resolution with `ts-morph`'s `getImportDeclarations()` helpers and `getModuleSpecifierValue()`.
- Provide a small in-memory graph traversal to compute per-action reachable nodes and produce a unique visited set to prevent cycles.
- Generate DOT by emitting plain text. Keep the output deterministic (sorted nodes/edges) to make tests reliable.
- For tests use `ts-jest` so tests can import TypeScript code directly or compile prior to test execution.
- For CLI argument parsing use `commander`. Implement a programmatic entrypoint so tests can import `graphCommand` functions without spawning a process.

Files to include in the generated repo (minimum)
- package.json with dependencies, bin mapping for the CLI, and scripts:
  - "build": "tsc -p tsconfig.json"
  - "test": "jest"
  - "start"/"cli": "node ./dist/cli.js"
- tsconfig.json minimal config for Node + esModuleInterop.
- `src/parser.ts`, `src/graph.ts`, `src/cli.ts`, `src/types.ts`
- `tests/parser.spec.ts`, `tests/graph.spec.ts` (using fixtures in examples).
- README.md with short usage and examples.

Small example DOT fragment to match styling (for Copilot to copy exactly)
- Use this style template for nodes and edges:

digraph G {
  rankdir=LR;
  node [fontname="Helvetica"];
  "FirstComponent" [label="FirstComponent", shape=box, style=filled, fillcolor="#BFD8FF", color="#3B82F6"];
  "action1" [label="action1", shape=ellipse, style="filled,bold", fillcolor="#FFD6D6", color="#B91C1C", penwidth=3];
  "action2" [label="action2", shape=ellipse, style=filled, fillcolor="#FFF7BF", color="#D97706"];
  "effect1$" [label="effect1$", shape=oval, style=filled, fillcolor="#E8EAF6", color="#6B21A8"];
  "firstReducer" [label="firstReducer", shape=folder, style=filled, fillcolor="#D7F5E9", color="#059669"];
  "FirstComponent" -> "action1" [label="dispatch"];
  "action1" -> "effect1$" [label="triggers"];
  "effect1$" -> "action2" [label="outputs"];
  "action3" -> "firstReducer" [label="handled"];
}

Make tests assert presence of these attributes and required edges (string matching is OK).

Small checklist for generated code by Copilot
- [ ] ts-morph parsing of `createAction`, `createEffect`, `ofType`, `store.dispatch`, `createReducer` & `on`.
- [ ] Structure JSON writer/reader with `--force` semantics.
- [ ] DOT generator with styling and selected-action highlight.
- [ ] CLI wiring and flags.
- [ ] Jest tests for fixtures and one dot generation test.
- [ ] README with example CLI commands and how to run tests.

Finally, create the files using the above layout and code. Guarantee:
- deterministic output (sort keys when writing JSON and sort nodes/edges when writing DOT),
- tests are runnable with `npm test` after `npm install`,
- code is TypeScript-typed and passes `tsc` (basic level).

If anything above is ambiguous, prefer the behavior demonstrated in the repo's `docs/examples/*` fixtures (case1 & case2) — match their JSON shapes and DOT visual semantics.
