# Ghost Writer Web App

This folder contains the Vite + React web app for Ghost Writer.

## Commands

```bash
npm run dev
npm run dev:electron
npm run lint
npm run test
npm run test:run
npm run build
npm run build:electron
npm run dist:win
npm run dist:mac
npm run dist
npm run metrics:package
npm run check
```

## Electron desktop build

Ghost Writer now supports a lightweight Electron desktop wrapper using `electron-vite` and `electron-builder`.

- Dev desktop app: `npm run dev:electron`
- Build desktop bundles: `npm run build:electron`
- Windows installer (NSIS, x64): `npm run dist:win`
- macOS installer (DMG, x64): `npm run dist:mac`

Notes:

- Source maps are excluded from production desktop bundles.
- Production packaging uses `asar`.
- Startup telemetry is written to Electron user data at `telemetry/startup-metrics.jsonl`.
- Package-size snapshots are written to `metrics/package-size.json`.

## Environment variables

- `VITE_OLLAMA_BASE_URL` (optional): Override the Ollama base URL.  
  Default: `http://localhost:11434`

Example:

```bash
# Optional if you need a non-default Ollama host:
# echo VITE_OLLAMA_BASE_URL=http://localhost:11434 > .env
npm run dev
```
