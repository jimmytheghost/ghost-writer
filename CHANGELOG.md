# Changelog

All notable changes to this project are documented in this file.

## [0.1.3] - 2026-02-26

### Added

- Live inline placeholder highlighting now starts immediately when `{{` is typed and remains active until `}}` is entered.
- Dash input stability runbook: `docs/agent-workflows/dash-input-stability-runbook.md`.

### Changed

- Disabled all editor dash auto-conversion behavior so `-`, `--`, and `---` remain literal while typing.
- Fixed macOS cursor-jump regression triggered after dash sequences when pressing space.

## [0.1.2] - 2026-02-24

### Added

- Editor spellcheck setting persisted in desktop settings and exposed in Settings modal.
- In-app misspelling detection and red underline rendering for reliable spelling feedback on macOS.
- Spellcheck timing behavior that checks words after they are committed with whitespace.
- Spellcheck unit tests covering committed-word behavior.

### Changed

- Increased settings modal container max height by 20px for improved layout.
- Updated editor spellcheck attributes (`autoCorrect`, language hinting) to improve platform integration.

## [0.1.1] - 2026-02-23

### Added

- Desktop always-on-top toggle in footer controls.
- Universal always-on-top shortcut: `Cmd/Ctrl + T`.
- Compact footer treatment for narrow widths (`<=430px`) with square model selector control.
- Custom model-selector icon integration for compact mode (light/dark variants).

### Changed

- Updated desktop launch and minimum window size to `400x500`.
- Standardized global shortcuts to universal `Cmd/Ctrl` combinations:
  - `Cmd/Ctrl + S` save
  - `Cmd/Ctrl + O` open
  - `Cmd/Ctrl + N` new document
  - `Cmd/Ctrl + M` preview toggle
- Removed in-app model reload control; model refresh remains snapshot-driven via `npm run sync:models`.
- Refined compact model-selector icon rendering and hover behavior.
- Replaced app icon assets with latest Ghost Writer logo and regenerated Tauri icon bundle.

## [0.1.0] - 2026-02-21

### Added

- Initial open-source baseline docs: `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`.
- CI workflow for automated quality checks.
- Markdown sanitizer hardening utility and configuration support for `VITE_OLLAMA_BASE_URL`.
- Keyboard shortcut: `Ctrl + Shift + M` to toggle markdown preview.
- Initial automated tests with Vitest and React Testing Library.

### Changed

- Improved editor/prompt layout behavior and spacing.
- Updated project scripts to include automated test execution in `npm run check`.
