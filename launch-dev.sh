#!/bin/sh
cd "$(dirname "$0")/src/ghost-writer-editor" || exit 1
npm install
npm run dev