# Ghost Writer - Remaining Work Plan

This document tracks the final implementation status of the remaining items from the 27-mistake audit.

## Status Board

| # | Item | Status | Priority | Notes |
|---|---|---|---|---|
| 16 + 27 | Logging is mostly terminal/console only | Done | High | Structured JSONL logging + rotation + diagnostics export implemented. |
| 19 | Releases are still machine-local/manual | Done | High | Tag-driven GitHub Actions release pipeline + checksums + draft release. |
| 20 | Command-boundary input validation hardening | Done | Medium | Implemented in `src-tauri/src/main.rs` with tests. |

---

## Summary

- All remaining checklist items are complete as of 2026-03-01.
- No open implementation items remain in this document.

---

## Item 16 + 27: Structured Persistent Logging

### Why this was open
Runtime logging was mostly `console.*` (frontend) and `eprintln!` (Tauri), which was unstructured and ephemeral.

### Definition of done
- Structured logs are written to disk (JSONL) in app data directory.
- Log levels exist (`info`, `warn`, `error`) with consistent event names.
- Log rotation is enabled (target: `10 MB x 5 files`).
- Sensitive data redaction rules are enforced.
- App includes a user-facing diagnostics action (`Copy` or `Export diagnostics`).

### Files changed
- `src-tauri/src/main.rs`
- `src/ghost-writer-editor/src/lib/desktopRuntime.js`
- `src/ghost-writer-editor/src/App.jsx`
- `src/ghost-writer-editor/src/hooks/useTauriMenuEvents.js`
- `src/ghost-writer-editor/src/components/AppModals.jsx`

### Verification
- Trigger at least one `info`, `warn`, and `error` path.
- Confirm JSONL entries exist in app data dir with required fields: `ts`, `level`, `event`, `msg`.
- Confirm rotation behavior by generating enough logs to exceed max file size.
- Confirm diagnostics export/copy works and excludes secrets/content.

### Commit template
`feat(logging): add structured rotating logs and diagnostics export`

---

## Item 19: CI-Driven Releases

### Why this was open
Build/release scripts existed, but release packaging/signing was primarily local-machine driven.

### Definition of done
- Release workflow builds artifacts in GitHub Actions on tag (`v*`).
- Toolchains are pinned (Node + Rust).
- Artifacts are attached to GitHub Release with checksums.
- Manual local release path is no longer required for normal releases.
- CI docs describe the release flow and rollback path.

### Files changed
- `.github/workflows/` (new/updated release workflow)
- `docs/agent-workflows/release-runbook.md`
- `README.md`
- `src/ghost-writer-editor/README.md`

### Verification
- Dry-run workflow on branch or test tag.
- Confirm matrix builds expected targets.
- Confirm release artifacts and checksums are uploaded.
- Confirm required checks gate release job.

### Commit template
`ci(release): move desktop release pipeline to GitHub Actions`

---

## Item 20: Input Validation at Tauri Command Boundaries

### Why this was open
Validation existed in multiple places, but hardening at command boundaries was incomplete.

### Definition of done
- Payload size limits enforced for large string fields and arrays.
- Canonical path + allowed-root checks applied to file commands.
- Strict enum/range/schema validation added for settings and command args.
- Validation failures return explicit error messages/codes.

### Files changed
- `src-tauri/src/main.rs`

### Verification
- Add/extend tests for oversize payloads, invalid enums, invalid paths, and traversal attempts.
- Manual checks confirm valid inputs still work.
- Invalid inputs fail fast with deterministic error output.

### Commit template
`feat(validation): enforce command-boundary schemas, limits, and path safety`

---

## Historical Execution Order

1. Item 20 (boundary validation) to reduce security/risk first.
2. Item 16 + 27 (logging) to improve diagnosis during subsequent work.
3. Item 19 (CI release pipeline) once runtime behavior is stable.

---

## Completed / Not Applicable

Items closed previously: `1-15`, `17-18`, `21-26`.
