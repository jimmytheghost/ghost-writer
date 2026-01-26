#!/bin/zsh

set -e

DEV_PORT=5173

echo "Stopping Wraider dev server on port $DEV_PORT..."
EXISTING_PIDS=$(lsof -ti tcp:$DEV_PORT || true)
if [[ -z "$EXISTING_PIDS" ]]; then
  echo "No process found on port $DEV_PORT."
  exit 0
fi

echo "Killing process(es): $EXISTING_PIDS"
kill $EXISTING_PIDS

echo "Wraider dev server stopped."