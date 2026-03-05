- [x] Normalize issue tracking docs to avoid stale/duplicate guidance:
  - [x] `docs/ghost-writer-issues.md`
  - [x] `docs/ghost-writer-to-dos.md`
  - [x] `docs/ghost-writer-to-dos-2.md`
  - [x] `docs/ghost-writer-to-dos-3md.md` (this file)
- [x] Ensure every listed issue has:
  - [x] exact file path
  - [x] exact line or function
  - [x] severity (`critical/high/medium/low`)
  - [x] acceptance criteria
- [x] Remove duplicated report blocks and conflicting version claims.
- [x] Keep one canonical "active issues" document and link others to it.

## 0) Agent Run Rules (Do First)

- [x] Work from `src/ghost-writer-editor/` for all npm commands.
- [x] Before changing code, capture baseline:
  - [x] `npm run lint`
  - [x] `npm run test:run`
  - [x] `npm run build`
- [x] If baseline already fails, log failures in `docs/dev-logs/` and avoid unrelated refactors.
- [x] After each task cluster, rerun only relevant tests, then full `npm run check` before finalizing.
- [x] Do not remove user-made unrelated changes from git working tree.

## 2) High-Priority Functional Fixes

### 2.1 File size guardrails

- [x] Replace placeholder constants in `src/lib/appUtils.js`:
  - [x] `MAX_LOAD_FILE_SIZE_BYTES` - already correct at 10MB
  - [x] `FILE_TOO_LARGE_MESSAGE` - already correct
- [x] Verify every load path uses limits:
  - [x] file dialog open - uses limit
  - [x] recent files/open-recent - uses limit
- [x] Add tests for:
  - [x] file below limit succeeds - `src/lib/appUtils.test.js`
  - [x] file above limit is rejected - `src/App.desktop-save.test.jsx`
  - [x] no silent failure state

### 2.2 Version consistency in UI

## 2.2 Version consistency in UI

- [x] Resolve app version fallback mismatch in `src/App.jsx` (`useState('0.1.0')` at line 94):
  - [x] Magic string fallback remains as neutral default - appVersion state updated by `useDesktopAppMetadata` hook line 460
  - [x] Web shows package.json version, Tauri reads its Tauri version
- [x] Confirm versions align across:
  - [x] `src/ghost-writer-editor/package.json` - 1.4.6
  - [x] `src-tauri/tauri.conf.json` - 1.4.6  
  - [x] About modal shows Tauri-derived version via hook
- [x] Add test/assertion for version consistency

### 2.3 Desktop menu typo + label quality

- [x] Fix typo in `src-tauri/src/main.rs` (line 159):
  - [x] `"View Color Output"` -> `"View Colored Output"`
- [ ] Review neighboring menu labels for consistency ("View/Hide …" symmetry).
- [ ] Validate menu event wiring still matches label IDs.

## 3) Stability and Resilience

### 3.1 React crash containment

- [ ] Add app-level Error Boundary for fatal render/runtime errors.
- [ ] Decide fallback UX:
  - [ ] show recoverable error panel
  - [ ] keep app chrome available if possible
  - [ ] include "copy diagnostics" action if diagnostics API exists
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

- [x] Audit `console.warn`/`console.*` usage in runtime-critical paths - errors routed through existing system
- [x] Route meaningful errors through existing reporting/diagnostics channel
- [x] Keep developer diagnostics in dev only where appropriate

### 5.3 Repo hygiene

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