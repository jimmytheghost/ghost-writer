# Ghost Writer TODO

Last reviewed: 2026-03-07

This is the single source of truth for active Ghost Writer work. Historical task lists, split issue trackers, and superseded pointers are archived in `docs/_old/`.

## Release Track

- Current shipped baseline: `1.4.16`
- Next working version: `1.4.17+`
- Production release target: `1.5.0`

## Active Work

### Release Blockers

- [ ] Fix the Windows cursor/input desync that still reproduces in longer documents.
  - Current status: cursor handling was hardened for `1.4.16`, but further testing confirmed the bug still remains.
  - Observed behavior:
    ```text
    Cursor issues remain    |
    ```
    ```text
    At the end of a | line.
    ```
  - Impact: the visible caret can drift away from the real insertion point, which makes editing and deletion unreliable.
  - Current implementation decision:
    - On Windows, Ghost Writer will stop relying on persistent blurred editor-text overlays to show saved selections.
    - The Windows editor should keep native text/caret behavior stable and preserve selection intent in app state instead.
    - When focus moves from the editor to the prompt input, Windows should show prompt-adjacent selected-text context rather than a duplicated in-editor selection overlay.
    - macOS keeps the current persistent in-editor selection-highlight behavior unless later testing shows the same instability there.

- [ ] Make native Save/Open dialogs stay above the app window when `Pin to Top` is enabled.
  - Goal: dialog windows must not hide behind the always-on-top Ghost Writer window.

- [ ] Run manual install smoke tests on both Windows and macOS before calling `1.5.0` production-ready.
  - Windows checklist: `docs/manual-install-smoke-test-windows.md`
  - macOS checklist: `docs/manual-install-smoke-test-macos.md`
  - Signoff intent: manual verification will be performed on a real PC and a real Mac.

### Release Preparation

- [ ] Create custom installer artwork/branding assets.
  - Scope: installer-specific graphics only, not general in-app branding copy.

- [ ] Bump the app version along the working track (`1.4.17+`) while remaining fixes are in progress.
  - `1.5.0` is reserved for the production release once blockers and smoke tests are complete.

## Current Baseline

- `1.4.16` is the current repo/app version.
- Completed before shipping `1.4.16`:
  - Default desktop window size updated to `600 x 900`.
  - Branding copy updated to `Vibe Coded by JimmyTheGhost (www.JimmyWeber.com)`.
  - Markdown preview/editor scroll sync behavior adjusted to remove visible shake/blur looping.
  - Dirty-tab close now preserves unsaved work if the save dialog is canceled.
  - App quit/window close now routes through unsaved-work protection, and session restore keeps unsaved drafts/edits.
  - MD prompts visibility preference now persists in settings and stays synchronized with the Tauri menu state.
  - Word export relabeled to `Word-Compatible HTML` to match the actual output format.
  - Windows editor cursor/input handling was hardened, but not fully resolved.
- Current desktop Ollama behavior:
  - On macOS and Windows, the app loads the user's installed Ollama models live at launch.
  - If Ollama is unavailable, the model picker stays empty and shows an error instead of stale models.

## Most Recent Verification

- `npm run lint` passed.
- `npm run build` passed.
- `cargo check` passed.
- `npm run build:tauri:win` passed and produced Windows installer/exe artifacts for `1.4.16`.
- `npm run test:run` could not be completed in the sandbox because Vite/esbuild failed with `spawn EPERM`.

## Current UX Direction

- Windows selection + prompt flow target:
  - Users can select text in the editor, click into the prompt input, and still clearly see what text the prompt will edit.
  - On Windows, that context should be shown beside the prompt, not by repainting the full selected text in the editor after blur.
  - Saved selection state should include tab identity, selected text, and selection offsets so prompt submission can still rewrite the intended range.
- macOS selection + prompt flow target:
  - Keep the current persistent in-editor selection highlight behavior for now, since it remains visually acceptable there.

## Related References

- Execution evidence: `docs/dev-logs/2026/2026-03-05.md`
- Windows selection UX decision log: `docs/dev-logs/2026/2026-03-07.md`
- Manual QA entry point: `docs/manual-install-smoke-test.md`
- Backup/workspace policy: `docs/reference/repo-backup-and-workspace-policy.md`
