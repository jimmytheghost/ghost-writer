#!/bin/zsh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$PROJECT_ROOT/src/ghost-writer-editor"
DEV_PORT=5174

echo "Ghost Writer launcher: checking for processes on port $DEV_PORT..."
EXISTING_PIDS=$(lsof -ti tcp:$DEV_PORT || true)
if [[ -n "$EXISTING_PIDS" ]]; then
  echo "Stopping existing process(es) on port $DEV_PORT: $EXISTING_PIDS"
  kill $EXISTING_PIDS
  sleep 1
fi

echo "Starting Ghost Writer dev server..."
cd "$APP_DIR"

npm install

nohup npm run dev >/tmp/ghost-writer-dev.log 2>&1 &

echo "Opening browser..."
open "http://localhost:$DEV_PORT/"

echo "Ghost Writer dev server launched. Logs: /tmp/ghost-writer-dev.log"
echo "You can close this window if desired."
