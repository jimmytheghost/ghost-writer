# Ghost Writer TODO (Current)

Last reviewed: 2026-03-06

This list tracks remaining work first. When no work is open, it keeps a short release-status summary here and stores full execution details in `docs/dev-logs/2026/2026-03-05.md`.

## Remaining Work

### Developer Tasks

[ ] Manual Smoke Test

### Agent Notes

[ ] Version up to 1.5.0
[ ] Create branding and custom installer graphics
[ ] When "Pin to Top" is toggled and user clicks Save or Open, that dialogue should be on top of the Ghost Writer window. This prevents dialogue windows from "hiding" behind the "pinned to top" window.
[ ] Cursor issues remain on Windows. In longer documents, the cursor is not synced properly with the text. You get this kind of effect where the cursor appears "ahead" of the text by many spaces:
    ```
    [ ] Cursor issues remain    |
    ```
    - Also, when the cursor should be at the end of a line, sometimes it appears a few spaces before the end of the line like this.
    ```
    At the end of a | line.
    ```
    - This is a major issue because the user will move the cursor to edit something and when they type or delete, the real cursor is in a different location causing all kinds of issues.

## Current Release Status

- Current repo/app version is `1.4.16`.
- The `2026-03-06` review issues in this batch were completed before shipping `1.4.16`.
- Completed in this release:
- Default desktop window size updated to `600 x 900`.
- Branding updated to `Vibe Coded by JimmyTheGhost (www.JimmyWeber.com)`.
- Markdown preview/editor scroll sync behavior was adjusted to remove the visible shake/blur loop.
- Dirty-tab close now preserves unsaved work if the save dialog is canceled.
- App quit/window close now routes through unsaved-work protection, and session restore now keeps unsaved drafts/edits.
- MD prompts visibility preference now persists in settings and stays synchronized with the Tauri menu state.
- Word export was relabeled to `Word-Compatible HTML` to match the actual output format.
- Windows editor cursor/input handling was hardened.
- Most recent local verification before packaging:
- `npm run lint` passed.
- `npm run build` passed.
- `cargo check` passed.
- `npm run build:tauri:win` passed and produced the Windows installer/exe artifacts for `1.4.16`.
- `npm run test:run` could not be completed in the sandbox because Vite/esbuild failed with `spawn EPERM`.

## Backlog Snapshot

- [x] Route production `console.warn` paths through diagnostics/logging channel.
- [x] Document backup folder policy (`src/ghost-writer-editor/.backups/`, `_backups/`).
- [x] Clarify root vs editor workspace `package.json` ownership in contributor docs.
