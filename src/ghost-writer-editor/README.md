# Ghost Writer Web App

This folder contains the Vite + React web app for Ghost Writer.

## Current behavior highlights

- Desktop window launches at `600x900` and starts centered.
- Desktop minimum window size is `430x560`, aligned to responsive breakpoints.
- Universal shortcuts use `Cmd` on macOS and `Ctrl` on Windows/Linux.
- Footer includes always-on-top toggle (`Cmd/Ctrl + T`) in Tauri builds.
- Narrow-width footer mode (`<=430px`) uses compact square controls, including a model selector icon button.
- Desktop model loading is live at runtime through the Tauri backend.
- `npm run sync:models` still writes support/build snapshots, but those files are not the desktop source of truth.
- Inline prompt highlighting starts as soon as `{{` is typed and closes when `}}` is typed.
- Markdown load/open flows enforce a 10MB max file-size guardrail with an explicit error message.

## Canonical docs

- `../../docs/docs-index.md` is the entry point for current source-of-truth docs.
- `../../docs/ghost-writer-todo.md` tracks active work, blockers, and release direction.
- `README.md` in this folder is a contributor overview, not the authoritative task tracker.

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

3. Start Ollama on that machine if it is not already running:

```bash
ollama serve
```

4. Launch/relaunch Tauri:

```bash
npm run dev:tauri
```

After launch, the footer model dropdown should show your local model list.
If Ollama is unavailable, the desktop dropdown should stay empty and show an error state rather than stale model data.

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
