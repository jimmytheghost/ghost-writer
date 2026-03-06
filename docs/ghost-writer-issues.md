# Ghost Writer Issues (Canonical)

Last reviewed: 2026-03-06

This file tracks only currently open issues and release blockers.

## Open Issues

- None.

## Recently Resolved (kept for context)

- Manual QA signoff completed for `1.4.15` on Windows and macOS; pass notes appended to `docs/dev-logs/2026/2026-03-05.md` on 2026-03-06.
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
