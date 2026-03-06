# Ghost Writer Issues (Canonical)

Last reviewed: 2026-03-05

This file tracks only currently open issues and release blockers.

## Open Issues

### 1. Windows manual QA signoff is still pending
- Severity: high (release readiness)
- Location: `docs/ghost-writer-to-dos-3.md`, `docs/dev-logs/2026/2026-03-05.md`
- Current state:
  - Windows build artifact exists: `src/ghost-writer-editor/src-tauri/target/release/bundle/nsis/Ghost Writer_1.4.7_x64-setup.exe`
  - Automated checks passed (`npm run check`, `npm run build:tauri`)
  - Interactive installer + app workflow validation on Windows is not logged yet.
- Acceptance criteria:
  - Install and launch the 1.4.7 Windows build.
  - Verify core workflows (new/open/save, preview toggle, prompt stream + cancel, settings persistence).
  - Append pass/fail evidence to `docs/dev-logs/2026/2026-03-05.md`.

## Recently Resolved (kept for context)

- File-size load guardrails implemented (`MAX_LOAD_FILE_SIZE_BYTES = 10MB` + user-facing error).
- Version fallback now uses shared app metadata defaults + Tauri metadata hook.
- Tauri desktop defaults updated to `1100x700`, centered, with min size constraints.
- View menu label corrected to `View Colored Output`.
- App-level error boundary is in place (`AppErrorBoundary`).
- Ollama stream chunk parser now enforces buffer guardrails.
- Ollama endpoint is settings-driven and validated (`ollamaBaseUrl`).
- Production warning paths now route through diagnostics logging (`log_frontend_warning`).
- Backup and package/workspace ownership policy is documented in `docs/reference/repo-backup-and-workspace-policy.md`.

Detailed execution evidence lives in `docs/dev-logs/2026/2026-03-05.md`.
