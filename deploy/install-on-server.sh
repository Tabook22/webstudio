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
bash "$ROOT/deploy/start-server.sh"
# Come back after a reboot without asking for a password.
LINE='@reboot sleep 20 && /bin/bash /home/nasser/webstudio/deploy/start-server.sh >> /home/nasser/webstudio-data/reboot.log 2>&1'
(crontab -l 2>/dev/null | grep -v 'deploy/start-server.sh' || true; echo "$LINE") | crontab -
