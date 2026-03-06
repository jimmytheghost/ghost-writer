# Ghost Writer TODO (Current)

Last reviewed: 2026-03-06

This list tracks remaining work first. When no work is open, it keeps a short release-status summary here and stores full execution details in `docs/dev-logs/2026/2026-03-05.md`.

## Remaining Work

- No open items.

## Current Release Status

- Current repo/app version is `1.4.15`.
- Automated gate is complete:
  - `npm run check`
  - `npm run build:tauri`
- Manual QA is complete for `1.4.15` on both Windows and macOS.
- Pass notes were appended to `docs/dev-logs/2026/2026-03-05.md` on 2026-03-06.

## Backlog Snapshot

- [x] Route production `console.warn` paths through diagnostics/logging channel.
- [x] Document backup folder policy (`src/ghost-writer-editor/.backups/`, `_backups/`).
- [x] Clarify root vs editor workspace `package.json` ownership in contributor docs.
