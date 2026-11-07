#!/bin/bash
set -euo pipefail
ROOT=/home/nasser/webstudio
DATA=/home/nasser/webstudio-data
mkdir -p "$DATA"
if [ ! -d "$ROOT/.git" ]; then
  git clone https://github.com/Tabook22/webstudio.git "$ROOT"
else
  git -C "$ROOT" pull --ff-only
fi
python3 -m venv "$ROOT/backend/.venv"
"$ROOT/backend/.venv/bin/pip" install -r "$ROOT/backend/requirements.txt"
cd "$ROOT/frontend"
npm ci
VITE_BASE=/webstudio/ npm run build
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
curl -s -o /dev/null -w "page %{http_code}\n" http://127.0.0.1:8011/
