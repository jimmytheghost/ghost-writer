#!/bin/zsh

set -e

DEV_PORT=5174
PROJECT_PATTERN="ghost-writer/src/ghost-writer-editor/node_modules/.bin/vite"

echo "Stopping Ghost Writer dev server on port $DEV_PORT..."
EXISTING_PIDS=$(lsof -nP -tiTCP:$DEV_PORT -sTCP:LISTEN || true)

if [[ -n "$EXISTING_PIDS" ]]; then
  echo "Killing port listener process(es): $EXISTING_PIDS"
  kill -TERM $EXISTING_PIDS 2>/dev/null || true
  sleep 1
fi

REMAINING_PIDS=$(lsof -nP -tiTCP:$DEV_PORT -sTCP:LISTEN || true)
if [[ -n "$REMAINING_PIDS" ]]; then
  echo "Force killing stubborn process(es): $REMAINING_PIDS"
  kill -KILL $REMAINING_PIDS 2>/dev/null || true
fi

MATCHING_VITE_PIDS=$(pgrep -f "$PROJECT_PATTERN" || true)
if [[ -n "$MATCHING_VITE_PIDS" ]]; then
  echo "Stopping matching Ghost Writer Vite process(es): $MATCHING_VITE_PIDS"
  kill -TERM $MATCHING_VITE_PIDS 2>/dev/null || true
  sleep 1

  STILL_MATCHING_VITE_PIDS=$(pgrep -f "$PROJECT_PATTERN" || true)
  if [[ -n "$STILL_MATCHING_VITE_PIDS" ]]; then
    echo "Force killing remaining Ghost Writer Vite process(es): $STILL_MATCHING_VITE_PIDS"
    kill -KILL $STILL_MATCHING_VITE_PIDS 2>/dev/null || true
  fi
fi

if lsof -nP -tiTCP:$DEV_PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Warning: process still detected on port $DEV_PORT."
  exit 1
fi

echo "Ghost Writer dev server stopped."
