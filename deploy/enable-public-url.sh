#!/bin/bash
# One-time step. Connects https://nasserdiary.com/webstudio/ to the app on port 8011.
# Leaves every other location on nasserdiary.com unchanged.
set -euo pipefail
if [ "$(id -u)" -ne 0 ]; then
  echo "Run this once with: sudo bash /home/nasser/webstudio/deploy/enable-public-url.sh"
  exit 1
fi
CONF=/etc/nginx/sites-available/nasserdiary.conf
SNIPPET=/home/nasser/webstudio/deploy/nginx-webstudio.conf
if [ ! -f "$SNIPPET" ]; then
  echo "Missing $SNIPPET. Pull the latest code first."
  exit 1
fi
if ! grep -q "location /webstudio/" "$CONF"; then
  cp "$CONF" "$CONF.bak-webstudio"
  python3 - "$CONF" "$SNIPPET" <<'PY'
import sys
from pathlib import Path
conf = Path(sys.argv[1])
block = Path(sys.argv[2]).read_text().rstrip() + "\n\n"
text = conf.read_text()
needle = "    # =========================================================\n    # OPENCLAW DASHBOARD"
if needle not in text:
    raise SystemExit("Could not find the OpenClaw section, so nothing was changed.")
conf.write_text(text.replace(needle, block + needle, 1))
print("Added /webstudio/ in front of the existing site.")
PY
fi
if ! nginx -t; then
  if [ -f "$CONF.bak-webstudio" ]; then
    cp "$CONF.bak-webstudio" "$CONF"
    echo "nginx test failed. The previous site file was restored."
  fi
  exit 1
fi
systemctl reload nginx
echo
curl -fsS https://nasserdiary.com/webstudio/api/health
echo
curl -s -o /dev/null -w "studio %{http_code}\n" https://nasserdiary.com/webstudio/
curl -s -o /dev/null -w "home %{http_code}\n" https://nasserdiary.com/
echo "Public address: https://nasserdiary.com/webstudio/"
