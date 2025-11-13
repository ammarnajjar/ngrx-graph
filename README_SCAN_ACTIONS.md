# scan-actions (built into repo `src/cli.ts`)

This small CLI scans a codebase for NgRx actions defined using `createAction`, `createActionGroup`, or exported Action classes.

Usage (from repo root):

Install dependencies if needed:

```bash
npm install
```

Build and run:

```bash
npm run build
node dist/src/cli.js --dir ./path/to/project
```

For development (no build):

```bash
npx ts-node src/cli.ts --dir ./path/to/project --json
```

Notes:
- Uses TypeScript AST (fast) and `fast-glob` for file discovery.
- Adjust `--concurrency` flag for large repos (increase for many cores).
