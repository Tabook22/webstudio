#!/bin/bash
# Start Web Studio on 127.0.0.1:8011. Safe to run again: it leaves a healthy process alone.
set -euo pipefail
ROOT=/home/nasser/webstudio
DATA=/home/nasser/webstudio-data
mkdir -p "$DATA"
if curl -fsS http://127.0.0.1:8011/api/health >/dev/null 2>&1; then
  echo "already running"
  exit 0
fi
if [ -f "$DATA/uvicorn.pid" ]; then
  kill "$(cat "$DATA/uvicorn.pid")" 2>/dev/null || true
  sleep 1
fi
cd "$ROOT/backend"
WEBSTUDIO_DATA="$DATA" nohup "$ROOT/backend/.venv/bin/uvicorn" app.main:app --host 127.0.0.1 --port 8011 > "$DATA/uvicorn.log" 2>&1 &
echo $! > "$DATA/uvicorn.pid"
sleep 2
curl -fsS http://127.0.0.1:8011/api/health
echo
