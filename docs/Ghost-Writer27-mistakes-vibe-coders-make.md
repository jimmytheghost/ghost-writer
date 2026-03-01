# Ghost Writer - Remaining Work Plan

This document is the active implementation tracker for the remaining items in the 27-mistake audit.

## Status Board

| # | Item | Status | Priority | Notes |
|---|---|---|---|---|
| 16 + 27 | Logging is mostly terminal/console only | Done | High | Structured JSONL logging + rotation + diagnostics export implemented. |
| 19 | Releases are still machine-local/manual | Done | High | Tag-driven GitHub Actions release pipeline + checksums + draft release. |
| 20 | Command-boundary input validation hardening | Done | Medium | Implemented in `src-tauri/src/main.rs` with tests. |

---

## Item 16 + 27: Structured Persistent Logging

### Why this is open
Current runtime logging is mostly `console.*` (frontend) and `eprintln!` (Tauri), which is unstructured and ephemeral.

### Definition of done
- Structured logs are written to disk (JSONL) in app data directory.
- Log levels exist (`info`, `warn`, `error`) with consistent event names.
- Log rotation is enabled (target: `10 MB x 5 files`).
- Sensitive data redaction rules are enforced.
- App includes a user-facing diagnostics action (`Copy` or `Export diagnostics`).

### Files to change (expected)
- `src-tauri/src/main.rs`
- `src-tauri/Cargo.toml`
- `src/ghost-writer-editor/src/lib/` (new logger/diagnostics helper if needed)
- `src/ghost-writer-editor/src/` UI location for diagnostics action

### Verification
- Trigger at least one `info`, `warn`, and `error` path.
- Confirm JSONL entries exist in app data dir with required fields: `ts`, `level`, `event`, `msg`.
- Confirm rotation behavior by generating enough logs to exceed max file size.
- Confirm diagnostics export/copy works and excludes secrets/content.

### Commit template
`feat(logging): add structured rotating logs and diagnostics export`

---

## Item 19: CI-Driven Releases

### Why this is open
Build/release scripts exist, but release packaging/signing appears primarily local-machine driven.

### Definition of done
- Release workflow builds artifacts in GitHub Actions on tag (`v*`).
- Toolchains are pinned (Node + Rust).
- Artifacts are attached to GitHub Release with checksums.
- Manual local release path is no longer required for normal releases.
- CI docs describe the release flow and rollback path.

### Files to change (expected)
- `.github/workflows/` (new/updated release workflow)
- `src/ghost-writer-editor/package.json` (if script alignment needed)
- `README.md`
- `docs/agent-workflows/` release runbook

### Verification
- Dry-run workflow on branch or test tag.
- Confirm matrix builds expected targets.
- Confirm release artifacts and checksums are uploaded.
- Confirm required checks gate release job.

### Commit template
`ci(release): move desktop release pipeline to GitHub Actions`

---

## Item 20: Input Validation at Tauri Command Boundaries

### Why this is open
Validation exists in multiple places, but hardening at command boundaries is not yet complete.

### Definition of done
- Payload size limits enforced for large string fields and arrays.
- Canonical path + allowed-root checks applied to file commands.
- Strict enum/range/schema validation added for settings and command args.
- Validation failures return explicit error messages/codes.

### Files to change (expected)
- `src-tauri/src/main.rs`
- `src-tauri/src/` other command modules (if split)
- `src/ghost-writer-editor/src/lib/desktopRuntime.js` (if client-side contract updates are needed)

### Verification
- Add/extend tests for oversize payloads, invalid enums, invalid paths, and traversal attempts.
- Manual checks confirm valid inputs still work.
- Invalid inputs fail fast with deterministic error output.

### Commit template
`feat(validation): enforce command-boundary schemas, limits, and path safety`

---

## Recommended Execution Order

1. Item 20 (boundary validation) to reduce security/risk first.
2. Item 16 + 27 (logging) to improve diagnosis during subsequent work.
3. Item 19 (CI release pipeline) once runtime behavior is stable.

---

## Completed / Not Applicable

Items closed previously: `1-15`, `17-18`, `21-26`.
