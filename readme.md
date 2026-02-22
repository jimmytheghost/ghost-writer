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
- Responsive layout with fixed footer controls
- Custom in-app modals for Save and New-document confirmation
- Single-line AI prompt input with Enter-to-send behavior

## Current UI/UX Features

- Footer quick actions: New, Save, Load, Copy, Markdown Preview toggle, Theme toggle
- Markdown preview button remains visibly active while preview is on
- Preview container and editor container are size-matched for consistent mode switching
- Prompt actions are icon-based: Send, Stop, Undo/Redo, Clear
- Prompt panel and editor use Noto Sans Mono; app and preview typography use Noto Sans
- Preview rendering is sanitized before injection

## AI Editing Behavior

When you submit a prompt:

- If text is selected in the editor, AI output replaces that selection.
- If no text is selected, AI output inserts at the cursor location.
- Output streams into the document as it is generated.

## Keyboard Shortcuts

- `Ctrl/Cmd + B`: wrap selection with bold markdown markers (`**`)
- `Ctrl/Cmd + I`: wrap selection with italic markdown markers (`*`)
- `Ctrl + Shift + M`: toggle markdown preview mode
- `Ctrl + Shift + S`: save document
- `Ctrl + Shift + O`: load document
- `Ctrl + Shift + N`: new document
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

- `GET http://localhost:11434/api/tags` (load models)
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
