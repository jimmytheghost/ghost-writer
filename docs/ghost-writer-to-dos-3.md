# Ghost Writer TODO (Current)

Last reviewed: 2026-03-05

This list tracks only remaining work. Completed historical execution details are in `docs/dev-logs/2026/2026-03-05.md`.

## Release Gate

- [x] Run full automated gate from `src/ghost-writer-editor/`:
  - [x] `npm run check`
  - [x] `npm run build:tauri`
- [ ] Manual QA pass on Windows for v1.4.7

## Windows Manual QA (Remaining)

- [ ] Install and launch:
  - [ ] Run installer: `src/ghost-writer-editor/src-tauri/target/release/bundle/nsis/Ghost Writer_1.4.7_x64-setup.exe`
  - [ ] Launch app from Start Menu/Desktop shortcut
  - [ ] Verify top menus render (`File`, `Edit`, `View`, `Settings`)
- [ ] Core workflows:
  - [ ] New tab -> type -> save `.md` -> reopen -> verify round-trip
  - [ ] Toggle Markdown preview and verify `Escape` closes preview
  - [ ] Prompt generation stream appears and stop button cancels stream
- [ ] Version/settings checks:
  - [ ] About modal shows `1.4.7`
  - [ ] Change settings, quit, relaunch, verify persistence
- [ ] Evidence/logging:
  - [ ] Append pass/fail notes to `docs/dev-logs/2026/2026-03-05.md`
  - [ ] Mark Windows QA complete in this file and `docs/ghost-writer-issues.md`

## Backlog (Non-blocking)

- [x] Route production `console.warn` paths through diagnostics/logging channel.
- [x] Document backup folder policy (`src/ghost-writer-editor/.backups/`, `_backups/`).
- [x] Clarify root vs editor workspace `package.json` ownership in contributor docs.
