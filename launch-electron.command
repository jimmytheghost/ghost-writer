#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/src/ghost-writer-editor"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build and open a proper macOS app bundle so Dock/Menu name is "Ghost Writer"
echo "Building Ghost Writer macOS app bundle..."
npm run electron:build:mac:dir

APP_BUNDLE_PATH="$(find release -maxdepth 2 -name 'Ghost Writer.app' -print -quit)"

if [ -z "$APP_BUNDLE_PATH" ]; then
  echo "Could not find Ghost Writer.app in release/"
  exit 1
fi

echo "Opening $APP_BUNDLE_PATH..."
open "$APP_BUNDLE_PATH"
