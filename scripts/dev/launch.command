#!/bin/zsh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="$PROJECT_ROOT/src/ghost-writer-editor"
DEV_PORT=5174
OLLAMA_PORT=11434
OLLAMA_LOG=/tmp/ghost-writer-ollama.log

if [[ -x "/opt/homebrew/bin/node" ]]; then
  if /opt/homebrew/bin/node -e "const [maj,min]=process.versions.node.split('.').map(Number); const ok=(maj===20&&min>=19)||(maj===22&&min>=12)||(maj>22); process.exit(ok?0:1);" 2>/dev/null; then
    export PATH="/opt/homebrew/bin:$PATH"
  fi
fi

echo "Ghost Writer launcher: checking Ollama on port $OLLAMA_PORT..."
if ! lsof -i tcp:$OLLAMA_PORT >/dev/null 2>&1; then
  if ! command -v ollama >/dev/null 2>&1; then
    echo "Ollama is not installed or not on PATH. Please install Ollama."
    exit 1
  fi

  echo "Ollama is not running. Starting Ollama..."
  nohup ollama serve >"$OLLAMA_LOG" 2>&1 &

  OLLAMA_READY=0
  for _ in {1..20}; do
    if curl -sS "http://127.0.0.1:$OLLAMA_PORT/api/tags" >/dev/null 2>&1; then
      OLLAMA_READY=1
      break
    fi
    sleep 1
  done

  if [[ "$OLLAMA_READY" -eq 1 ]]; then
    echo "Ollama started successfully."
  else
    echo "Ollama did not become ready in time. Logs: $OLLAMA_LOG"
  fi
else
  echo "Ollama is already running."
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "Rust toolchain is not installed or not on PATH. Please install Rust (rustup, cargo, rustc)."
  exit 1
fi

echo "Ghost Writer launcher: checking for processes on port $DEV_PORT..."
EXISTING_PIDS=$(lsof -ti tcp:$DEV_PORT || true)
if [[ -n "$EXISTING_PIDS" ]]; then
  echo "Stopping existing process(es) on port $DEV_PORT: $EXISTING_PIDS"
  kill $EXISTING_PIDS
  sleep 1
fi

echo "Starting Ghost Writer dev server..."
cd "$APP_DIR"

npm ci

nohup npm run dev:tauri >/tmp/ghost-writer-dev.log 2>&1 &

echo "Ghost Writer dev server launched. Logs: /tmp/ghost-writer-dev.log"
echo "You can close this window if desired."
