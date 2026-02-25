#!/bin/sh
OLLAMA_PORT=11434

if [ -x "/opt/homebrew/bin/node" ]; then
  if /opt/homebrew/bin/node -e "const v=process.versions.node.split('.').map(Number); const ok=(v[0]===20 && v[1]>=19) || (v[0]===22 && v[1]>=12) || (v[0]>22); process.exit(ok?0:1);" >/dev/null 2>&1; then
    export PATH="/opt/homebrew/bin:$PATH"
  fi
fi

echo "Checking Ollama on port $OLLAMA_PORT..."
if ! lsof -i tcp:$OLLAMA_PORT >/dev/null 2>&1; then
  if ! command -v ollama >/dev/null 2>&1; then
    echo "Ollama is not installed or not on PATH."
    exit 1
  fi

  echo "Ollama is not running. Starting Ollama..."
  nohup ollama serve >/tmp/ghost-writer-ollama.log 2>&1 &

  i=0
  while [ $i -lt 20 ]; do
    if curl -sS "http://127.0.0.1:$OLLAMA_PORT/api/tags" >/dev/null 2>&1; then
      echo "Ollama started successfully."
      break
    fi
    i=$((i + 1))
    sleep 1
  done
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "Rust toolchain is not installed or not on PATH. Please install Rust (rustup, cargo, rustc)."
  exit 1
fi

cd "$(dirname "$0")/src/ghost-writer-editor" || exit 1
npm ci
npm run dev:tauri
