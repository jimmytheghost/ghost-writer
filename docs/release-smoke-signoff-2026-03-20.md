# Ghost Writer Release Smoke Signoff (2026-03-20)

Scope: release-track manual install smoke validation for `1.4.20` artifacts on real Windows and macOS machines.

## Summary

- Status: release smoke blocker satisfied for `1.5.0` readiness gate.
- Windows install/test run: passed.
- macOS install/test run: passed.
- Core editing/save/open/dirty-close/session restore/preview behavior: passed.
- Export/print/PDF smoke checks: passed.
- Diagnostics export: passed (used repeatedly during debugging and validated on fresh `1.4.20` run).
- Ollama startup behavior: passed on both platforms.
  - Verified behavior: when Ollama is stopped before app launch, Ghost Writer auto-starts/reaches Ollama, model list populates, and prompt generation succeeds.

## Evidence

- Windows `1.4.20` installer artifact:
  - `src/ghost-writer-editor/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Ghost Writer_1.4.20_x64-setup.exe`
- Diagnostics (`1.4.20`, Windows):
  - `docs/diagnostics/ghost-writer-diagnostics-2.json`
- Manual smoke notes used during final pass:
  - `F:\Dropbox\_Personal Projects\Ghost Writer\manual-install-smoke-test-macos-2.md`

## Notes

- Checklist wording was updated on `2026-03-20` to distinguish:
  - expected auto-start behavior when Ollama is initially stopped
  - fallback behavior for truly unavailable Ollama.
- No blocking regressions were reported in this signoff pass.
