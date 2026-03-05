# Ghost Writer Web App

This folder contains the Vite + React web app for Ghost Writer.

## Current behavior highlights

- Desktop window launches at `400x500` with minimum `400x500`.
- Universal shortcuts use `Cmd` on macOS and `Ctrl` on Windows/Linux.
- Footer includes always-on-top toggle (`Cmd/Ctrl + T`) in Tauri builds.
- Narrow-width footer mode (`<=430px`) uses compact square controls, including a model selector icon button.
- Model list is snapshot-based and refreshed by `npm run sync:models` (no in-app reload button).
- Inline prompt highlighting starts as soon as `{{` is typed and closes when `}}` is typed.

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
- macOS DMG bundle: `npm run build:tauri:mac` (auto-selects installed Apple target)

Notes:

- Tauri artifacts are produced under `src-tauri/target/release/bundle`.
- Tauri size snapshots are written to `metrics/tauri-size.json`.
- Rust toolchain is required (`rustup`, `cargo`, `rustc`) before running Tauri commands.
- `dev:tauri` and `build:tauri*` refresh the model snapshot with `sync:models` before launch/build.
- Model snapshots are written to `public/ollama-models.json` and `src/generated/ollama-models.json`.
- Optional macOS target override: `TAURI_MAC_TARGET=x86_64-apple-darwin npm run build:tauri:mac`

Keyboard shortcuts:

- `Cmd/Ctrl + S` save
- `Cmd/Ctrl + O` open
- `Cmd/Ctrl + N` new
- `Cmd/Ctrl + P` print rendered markdown
- `Cmd/Ctrl + M` preview toggle
- `Cmd/Ctrl + T` always-on-top toggle (desktop/Tauri)
- `Cmd/Ctrl + Enter` send prompt

## Load Local Models

To load local models into the Ghost Writer dropdown:

1. Install/pull one or more models with Ollama:

```bash
ollama pull llama3.1:8b
# or any model you want to use
```

2. Confirm models exist locally:

```bash
ollama list
```

3. Refresh Ghost Writer model snapshots:

```bash
npm run sync:models
```

4. Launch/relaunch Tauri:

```bash
npm run dev:tauri
```

After launch, the footer model dropdown should show your local model list.

Important:
- If models changed, run `npm run sync:models` before expecting dropdown changes.

Canonical runbook for developers and agents:
- `../../docs/agent-workflows/local-models-runbook.md`
- `../../docs/agent-workflows/print-and-pdf-runbook.md`
- `../../docs/agent-workflows/dash-input-stability-runbook.md`
- `../../docs/agent-workflows/release-runbook.md`

## Environment variables

- `VITE_OLLAMA_BASE_URL` (optional, web runtime): Override the Ollama base URL.  
  Default: `http://127.0.0.1:11434`
- Desktop/Tauri runtime: configure `Ollama endpoint` in Settings.  
  Default: `http://127.0.0.1:11434` and validated as `http(s)://host[:port]`.

Example:

```bash
# Optional if you need a non-default Ollama host:
# echo VITE_OLLAMA_BASE_URL=http://127.0.0.1:11434 > .env
npm run dev
```
