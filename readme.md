# Ghost Writer

Ghost Writer is a local-first markdown writing app with built-in Ollama assistance.
It is designed for fast drafting, rewriting, and iterative editing without leaving the editor.

## Highlights

- Focused markdown editor with matching markdown preview mode
- Local model integration via Ollama (`http://localhost:11434`)
- Selection-aware AI insertion/replacement
- Streaming generation with Stop/Undo/Redo
- Save/Load markdown files (`.md`)
- Copy full document or current selection
- Light/dark theme toggle
- Always-on-top toggle (desktop/Tauri)
- Responsive layout with fixed footer controls
- Custom in-app modals for Save and New-document confirmation
- Single-line AI prompt input with Enter-to-send behavior

## Current UI/UX Features

- Footer quick actions: New, Save, Load, Copy, Markdown Preview toggle, Theme toggle, Always-on-top toggle
- Markdown preview button remains visibly active while preview is on
- Preview container and editor container are size-matched for consistent mode switching
- Prompt actions are icon-based: Send, Stop, Undo/Redo, Clear
- Prompt panel and editor use Noto Sans Mono; app and preview typography use Noto Sans
- Preview rendering is sanitized before injection
- Compact footer behavior at narrow widths (`<=430px`) with square model selector button

## AI Editing Behavior

When you submit a prompt:

- If text is selected in the editor, AI output replaces that selection.
- If no text is selected, AI output inserts at the cursor location.
- Output streams into the document as it is generated.

## Keyboard Shortcuts

- `Ctrl/Cmd + B`: wrap selection with bold markdown markers (`**`)
- `Ctrl/Cmd + I`: wrap selection with italic markdown markers (`*`)
- `Ctrl/Cmd + M`: toggle markdown preview mode
- `Ctrl/Cmd + S`: save document
- `Ctrl/Cmd + O`: load document
- `Ctrl/Cmd + N`: new document
- `Ctrl/Cmd + T`: toggle always-on-top (desktop/Tauri)
- `Enter` (inside AI prompt input): send prompt

## Requirements

- Node.js `20.19+` or `22.12+`
- npm
- Ollama running locally with at least one installed model

## Run Locally

### Option 1: Launch scripts (project root, Tauri)

- Windows: `launch-dev.bat`
- macOS: `launch.command`
- Shell: `launch-dev.sh`

Stop script (macOS): `stop.command`

### Option 2: Manual

```bash
cd src/ghost-writer-editor
npm ci
npm run dev
```

Then open: `http://localhost:5174`

## Desktop App (Tauri)

Ghost Writer uses a lightweight Tauri desktop wrapper.

```bash
cd src/ghost-writer-editor
npm ci
npm run dev:tauri
```

Build desktop artifacts:

```bash
cd src/ghost-writer-editor
npm run build:tauri
npm run build:tauri:win
# npm run build:tauri:mac
```

Default desktop window sizing:

- Launch size: `400x500`
- Minimum size: `400x500`

Model dropdown behavior:

- `npm run dev:tauri` and `npm run build:tauri*` run `npm run sync:models` first.
- `sync:models` reads `ollama list` and writes model snapshots to:
  - `src/ghost-writer-editor/public/ollama-models.json`
  - `src/ghost-writer-editor/src/generated/ollama-models.json`
- The app model dropdown is initialized from the generated snapshot for deterministic startup.
- There is no in-app model reload button; refresh models by rerunning `npm run sync:models` (or restarting through `dev:tauri` / `build:tauri` scripts).

### Load Local Models

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
cd src/ghost-writer-editor
npm run sync:models
```

4. Launch/relaunch Tauri:

```bash
cd src/ghost-writer-editor
npm run dev:tauri
```

After launch, the footer model dropdown should show your local model list.

For full setup, failure recovery, and cross-machine behavior, use:
- `docs/agent-workflows/local-models-runbook.md`

Performance metrics snapshot:

```bash
cd src/ghost-writer-editor
npm run metrics:package
npm run metrics:tauri
```

Tauri prerequisites:

- Rust toolchain installed (`rustup`, `cargo`, `rustc`)

Current packaging target outputs:

- Bundles are produced under `src/ghost-writer-editor/src-tauri/target/release/bundle`.

## Model Endpoint

Ghost Writer expects Ollama at:

- `POST http://localhost:11434/api/generate` (stream responses)

You can override the default endpoint with `VITE_OLLAMA_BASE_URL`.

## Quality Checks

```bash
cd src/ghost-writer-editor
npm run check
```

## Project Policies

- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`
- `CHANGELOG.md`
- `LICENSE`
