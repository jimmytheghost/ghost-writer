#!/bin/sh
cd "$(dirname "$0")/src/wraider-editor" || exit 1
npm install
npm run dev