# Ghost Writer

Ghost Writer is a local-first, distraction-free Markdown editor that embeds AI assistance directly into the writing workflow using on-device LLMs via Ollama.

For current active work, canonical docs, and release status, start with `docs/docs-index.md`.

## Highlights

- Focused markdown editor with matching markdown preview mode
- Local model integration via Ollama (`http://127.0.0.1:11434`)
- Selection-aware AI insertion/replacement
- Inline placeholder workflow with `{{...}}` tokens
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

Inline placeholder behavior:

- Typing `{{` immediately starts inline placeholder highlighting in blue.
- Text remains highlighted while the placeholder is open.
- Typing `}}` closes the placeholder highlight state.

## Keyboard Shortcuts

- `Ctrl/Cmd + B`: wrap selection with bold markdown markers (`**`)
- `Ctrl/Cmd + I`: wrap selection with italic markdown markers (`*`)
- `Ctrl/Cmd + M`: toggle markdown preview mode
- `Ctrl/Cmd + S`: save document
- `Ctrl/Cmd + O`: load document
- `Ctrl/Cmd + N`: new document
- `Ctrl/Cmd + P`: print rendered markdown
- `Ctrl/Cmd + T`: toggle always-on-top (desktop/Tauri)
- `Enter` (inside AI prompt input): send prompt
- `Ctrl/Cmd + Enter` (inside AI prompt input): send prompt

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
# if you use nvm
# nvm use
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

`build:tauri:mac` now auto-selects an installed macOS Rust target (`aarch64-apple-darwin` or `x86_64-apple-darwin`) based on host architecture.
You can override the target with `TAURI_MAC_TARGET`, for example:

```bash
TAURI_MAC_TARGET=x86_64-apple-darwin npm run build:tauri:mac
```

Default desktop window sizing:

- Launch size: `600x900`
- Minimum size: `430x560`

Model dropdown behavior:

- On desktop (macOS and Windows), Ghost Writer loads the user's installed Ollama models live when the app starts.
- The desktop app uses the Tauri backend to query Ollama at runtime, so each machine sees its own currently installed models.
- If Ollama is unavailable at launch, the model picker should stay empty and show a clear error instead of listing stale models.
- `npm run sync:models` still writes:
  - `src/ghost-writer-editor/public/ollama-models.json`
  - `src/ghost-writer-editor/src/generated/ollama-models.json`
- Those snapshot files are now support/build artifacts, not the desktop app's source of truth.

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

3. Start Ollama on that machine if it is not already running.

```bash
ollama serve
```

4. Launch/relaunch Tauri:

```bash
cd src/ghost-writer-editor
npm run dev:tauri
```

After launch, the footer model dropdown should show the models currently installed on that machine.
If Ollama is down, the dropdown should show no models and an error state.

For full setup, failure recovery, and cross-machine behavior, use:
- `docs/agent-workflows/local-models-runbook.md`

For print/PDF maintenance and margin tuning, use:
- `docs/agent-workflows/print-and-pdf-runbook.md`

For editor dash-input stability (no `-` auto-conversion or caret jump), use:
- `docs/agent-workflows/dash-input-stability-runbook.md`

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

CI release path:

- Tag-based desktop releases now run through GitHub Actions (`.github/workflows/release.yml`).
- Push a `v*` tag to trigger matrix builds + checksums + draft GitHub Release artifacts.
- Canonical process/runbook: `docs/agent-workflows/release-runbook.md`.

## Model Endpoint

Ghost Writer expects Ollama at:

- `POST http://127.0.0.1:11434/api/generate` (stream responses)

You can override the default endpoint with `VITE_OLLAMA_BASE_URL`.

## Quality Checks

```bash
cd src/ghost-writer-editor
npm run check
```

`npm run check` now includes a Node runtime preflight and fails fast when the active Node version is unsupported.

## Project Policies

- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`
- `CHANGELOG.md`
- `LICENSE`
