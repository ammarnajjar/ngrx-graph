#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
LOG=/tmp/ngrx-graph-pack-test-$(date +%s).log
echo "log: $LOG"

cd "$REPO_ROOT"
echo "Cleaning old tarballs..." | tee -a "$LOG"
rm -f ./*.tgz || true

echo "Building project..." | tee -a "$LOG"
npm run build --silent 2>&1 | tee -a "$LOG"

echo "Packing..." | tee -a "$LOG"
TGZ=$(npm pack --silent | tail -n 1)
echo "Created tarball: $TGZ" | tee -a "$LOG"

TMPDIR=$(mktemp -d /tmp/ngrx-graph-test-XXXX)
echo "Using temp project dir: $TMPDIR" | tee -a "$LOG"
cd "$TMPDIR"

echo "Initializing temp project..." | tee -a "$LOG"
npm init -y >/dev/null 2>&1

echo "Installing package from: $REPO_ROOT/$TGZ" | tee -a "$LOG"
npm install "$REPO_ROOT/$TGZ" --silent 2>&1 | tee -a "$LOG" || {
  echo "npm install failed" | tee -a "$LOG"
  exit 2
}

BIN="./node_modules/.bin/ngrx-graph"
if [ ! -x "$BIN" ]; then
  echo "Installed package has no CLI at $BIN" | tee -a "$LOG"
  ls -la node_modules || true
  exit 3
fi

echo "CLI help (first 40 lines):" | tee -a "$LOG"
$BIN --help 2>&1 | tee -a "$LOG" | sed -n '1,40p'

echo "Creating a minimal sample project inside temp dir..." | tee -a "$LOG"
mkdir -p src
cat > src/sample.actions.ts <<'TS'
import { createAction } from '@ngrx/store';
export const S = createAction('[T] S');
TS

echo "Running CLI to generate JSON + DOT..." | tee -a "$LOG"
$BIN -d src --out out --dot --json 2>&1 | tee -a "$LOG"

echo "Listing output dir:" | tee -a "$LOG"
ls -la out 2>&1 | tee -a "$LOG" || true

echo "Contents of out (head of JSON):" | tee -a "$LOG"
if [ -f out/ngrx-graph.json ]; then
  head -n 60 out/ngrx-graph.json | tee -a "$LOG"
else
  echo "No JSON output found" | tee -a "$LOG"
  exit 4
fi

echo "Pack test completed successfully. Log: $LOG" | tee -a "$LOG"
echo "Temp project left at: $TMPDIR" | tee -a "$LOG"

exit 0
