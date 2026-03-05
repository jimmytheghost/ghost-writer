# Ghost Writer Agent Fix Checklist (v3)

Purpose: provide a future AI agent with a reliable, ordered checklist to fix and harden Ghost Writer without introducing regressions.

Scope: `src/ghost-writer-editor/` only unless explicitly stated.

## 0) Agent Run Rules (Do First)

- [ ] Work from `src/ghost-writer-editor/` for all npm commands.
- [ ] Before changing code, capture baseline:
  - [ ] `npm run lint`
  - [ ] `npm run test:run`
  - [ ] `npm run build`
- [ ] If baseline already fails, log failures in `docs/dev-logs/` and avoid unrelated refactors.
- [ ] After each task cluster, rerun only relevant tests, then full `npm run check` before finalizing.
- [ ] Do not remove user-made unrelated changes from git working tree.

## 1) Source-of-Truth Audit (Stale Review Cleanup)

- [ ] Normalize issue tracking docs to avoid stale/duplicate guidance:
  - [ ] `docs/ghost-writer-issues.md`
  - [ ] `docs/ghost-writer-to-dos.md`
  - [ ] `docs/ghost-writer-to-dos-2.md`
  - [ ] `docs/ghost-writer-to-dos-3md.md` (this file)
- [ ] Ensure every listed issue has:
  - [ ] exact file path
  - [ ] exact line or function
  - [ ] severity (`critical/high/medium/low`)
  - [ ] acceptance criteria
- [ ] Remove duplicated report blocks and conflicting version claims.
- [ ] Keep one canonical “active issues” document and link others to it.

## 2) High-Priority Functional Fixes

### 2.1 File size guardrails

- [ ] Replace placeholder constants in `src/lib/appUtils.js`:
  - [ ] `MAX_LOAD_FILE_SIZE_BYTES` from `Number.POSITIVE_INFINITY` to a sane default (define and document rationale).
  - [ ] `FILE_TOO_LARGE_MESSAGE` from empty string to user-facing actionable text.
- [ ] Verify every load path actually uses these limits:
  - [ ] drag/drop
  - [ ] file dialog open
  - [ ] recent files/open-recent
- [ ] Add tests for:
  - [ ] file below limit succeeds
  - [ ] file above limit is rejected with clear message
  - [ ] no silent failure state

### 2.2 Version consistency in UI

- [ ] Resolve app version fallback mismatch in `src/App.jsx` (`useState('0.1.0')`):
  - [ ] replace magic string fallback with config-derived value or neutral placeholder.
  - [ ] ensure web and Tauri show consistent version.
- [ ] Confirm versions align across:
  - [ ] `src/ghost-writer-editor/package.json`
  - [ ] `src-tauri/tauri.conf.json`
  - [ ] About modal/version display in UI
- [ ] Add test/assertion where feasible to catch future version drift.

### 2.3 Desktop menu typo + label quality

- [ ] Fix typo in `src-tauri/src/main.rs`:
  - [ ] `"View Color Output"` -> `"View Colored Output"`.
- [ ] Review neighboring menu labels for consistency (“View/Hide …” symmetry).
- [ ] Validate menu event wiring still matches label IDs.

## 3) Stability and Resilience

### 3.1 React crash containment

- [ ] Add app-level Error Boundary for fatal render/runtime errors.
- [ ] Decide fallback UX:
  - [ ] show recoverable error panel
  - [ ] keep app chrome available if possible
  - [ ] include “copy diagnostics” action if diagnostics API exists
- [ ] Add tests proving boundary catches child throw and renders fallback.

### 3.2 Stream buffering and cancellation safety (Rust backend)

- [ ] Review streaming parser in `src-tauri/src/main.rs` (`ollama_generate_stream`):
  - [ ] confirm `buf` cannot grow without bound on malformed/non-newline streams.
  - [ ] add upper bound + fail-fast behavior for pathological payloads.
  - [ ] preserve cancellation responsiveness.
- [ ] Add tests for:
  - [ ] normal newline-delimited stream
  - [ ] long chunk without newline
  - [ ] cancelled stream path

### 3.3 Timeout alignment (frontend vs backend)

- [ ] Document and intentionally set timeout strategy:
  - [ ] frontend `OLLAMA_REQUEST_TIMEOUT_MS` in `src/lib/ollama.js`
  - [ ] backend reqwest timeout in `src-tauri/src/main.rs`
- [ ] Ensure behavior is coherent (streaming can be long; health checks should be short).

## 4) Configurability and Runtime UX

### 4.1 Ollama endpoint configuration

- [ ] Decide single strategy for endpoint configuration across web + desktop:
  - [ ] frontend env (`VITE_OLLAMA_BASE_URL`)
  - [ ] backend hardcoded `OLLAMA_ADDR`
- [ ] If backend remains fixed localhost, document explicitly in UI/docs.
- [ ] Preferred: add settings-driven host/port for desktop with safe validation.
- [ ] Update CSP/connect-src policy in `src-tauri/tauri.conf.json` accordingly.
- [ ] Add validation tests for invalid host/port inputs.

### 4.2 Window defaults and first-run ergonomics

- [ ] Reassess default desktop window size in `src-tauri/tauri.conf.json` (currently compact).
- [ ] Validate on common laptop resolutions and high-DPI displays.
- [ ] Keep minimum size constraints aligned with UI breakpoints.

## 5) Code Quality and Maintainability

### 5.1 Editor keyboard handling cleanup

- [ ] Refactor duplicated platform detection and modifier logic in `src/components/Editor.jsx`.
- [ ] Remove/clarify questionable blocks around event listener setup.
- [ ] Keep behavior identical; add focused keyboard shortcut tests before/after.

### 5.2 Logging hygiene

- [ ] Audit `console.warn`/`console.*` usage in runtime-critical paths.
- [ ] Route meaningful errors through existing reporting/diagnostics channel.
- [ ] Keep developer diagnostics in dev only where appropriate.

### 5.3 Repo hygiene

- [ ] Decide policy for `_backups/` directory:
  - [ ] keep but exclude from release artifacts and docs
  - [ ] or remove if obsolete
- [ ] Clarify root `package.json` purpose vs subproject `package.json` in README/docs.

## 6) Test Coverage Expansion

- [ ] Add/expand tests for each fixed bug (minimum one regression test per bug).
- [ ] Prioritize tests in:
  - [ ] `src/components/*.test.jsx` for UI behavior
  - [ ] `src/lib/*.test.js` for pure utility logic
  - [ ] Rust unit tests in `src-tauri/src/main.rs` where practical
- [ ] Validate cross-platform keyboard behavior (`Meta` vs `Ctrl`) in editor shortcuts.
- [ ] Add smoke test checklist for:
  - [ ] open/save/new tab flows
  - [ ] preview open/close and Escape behavior
  - [ ] prompt generation stream + cancel

## 7) Release Readiness Gate

- [ ] Run full quality gate from `src/ghost-writer-editor/`:
  - [ ] `npm run check`
  - [ ] `npm run build:tauri` (or platform-specific build command)
- [ ] Manual QA pass:
  - [ ] macOS app launch + core workflows
  - [ ] Windows app launch + core workflows
  - [ ] verify About/version display
  - [ ] verify settings persistence and restart behavior
- [ ] Confirm documentation matches actual shipped behavior:
  - [ ] endpoint configuration
  - [ ] file size limits
  - [ ] supported shortcuts

## 8) Completion Criteria (Definition of Done)

- [ ] No placeholder production constants for critical runtime limits/messages.
- [ ] Version display is accurate and derived from a single source strategy.
- [ ] No duplicated/stale review docs driving contradictory priorities.
- [ ] Added regression tests pass locally.
- [ ] `npm run check` passes.
- [ ] Tauri build passes for intended target(s).
- [ ] Final changelog/release notes mention user-visible fixes.

## 9) Suggested Work Order for a Future Agent

- [ ] Phase 1: high-risk correctness fixes (file size limits, version display, menu typo).
- [ ] Phase 2: resilience (error boundary, stream guardrails, timeout policy).
- [ ] Phase 3: configurability + UX defaults (Ollama settings, window size).
- [ ] Phase 4: cleanup/refactor/tests/docs.
- [ ] Phase 5: release gate + manual QA signoff.
