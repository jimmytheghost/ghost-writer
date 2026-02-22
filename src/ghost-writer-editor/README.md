# Ghost Writer Web App

This folder contains the Vite + React web app for Ghost Writer.

## Commands

```bash
npm run dev
npm run dev:tauri
npm run sync:models
npm run lint
npm run test
npm run test:run
npm run build
npm run build:tauri
npm run build:tauri:win
npm run build:tauri:mac
npm run metrics:package
npm run metrics:tauri
npm run check
```

## Tauri desktop build

- Dev desktop app: `npm run dev:tauri`
- Build desktop bundles: `npm run build:tauri`
- Windows NSIS bundle: `npm run build:tauri:win`
- macOS DMG bundle: `npm run build:tauri:mac`

Notes:

- Tauri artifacts are produced under `src-tauri/target/release/bundle`.
- Tauri size snapshots are written to `metrics/tauri-size.json`.
- Rust toolchain is required (`rustup`, `cargo`, `rustc`) before running Tauri commands.
- `dev:tauri` and `build:tauri*` refresh the model snapshot with `sync:models` before launch/build.
- Model snapshots are written to `public/ollama-models.json` and `src/generated/ollama-models.json`.

## Environment variables

- `VITE_OLLAMA_BASE_URL` (optional): Override the Ollama base URL.  
  Default: `http://localhost:11434`

Example:

```bash
# Optional if you need a non-default Ollama host:
# echo VITE_OLLAMA_BASE_URL=http://localhost:11434 > .env
npm run dev
```
