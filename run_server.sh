#!/usr/bin/env bash
# run_server.sh --- boots the llmjudge stack
#
# Full stack (API + worker + dashboard + postgres + redis) when docker is
# available; otherwise a local mode: API with a seeded in-memory store on
# :8000, plus the dashboard if node/npm is installed.
set -euo pipefail
cd "$(dirname "$0")"

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo ">> docker found: booting the full stack"
  cp -n .env.example .env 2>/dev/null || true
  exec docker compose -f docker/docker-compose.yml up --build
fi

echo ">> docker not found: local mode (API with seeded demo data)"

PYTHON="${PYTHON:-python3}"
VENV="${VENV:-.venv}"
if [ ! -d "$VENV" ]; then
  echo ">> creating $VENV"
  "$PYTHON" -m venv "$VENV" 2>/dev/null || "$PYTHON" -m venv --without-pip "$VENV"
  if [ ! -f "$VENV/bin/pip" ]; then
    curl -sS https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
    "$VENV/bin/python3" /tmp/get-pip.py -q
  fi
fi

echo ">> installing requirements"
"$VENV/bin/pip" install -q -r requirements.txt
"$VENV/bin/pip" install -q -e .

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  echo ">> node found: starting dashboard on :3000"
  (cd dashboard && npm install && npm run dev) &
else
  echo ">> node not found: skipping dashboard (API + /docs only)"
fi

echo ""
echo ">> API starting on http://localhost:8000"
echo ">> interactive docs: http://localhost:8000/docs"
echo ">> sample endpoints:"
echo "     GET /health"
echo "     GET /repos"
echo "     GET /runs?repo=agentflow"
echo "     GET /runs/run-001"
echo "     GET /compare/run-002/run-001"
echo "     GET /metrics"
echo ""

exec "$VENV/bin/python3" scripts/demo_server.py
