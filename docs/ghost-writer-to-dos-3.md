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
- [x] Review neighboring menu labels for consistency ("View/Hide …" symmetry).
- [x] Validate menu event wiring still matches label IDs.

## 3) Stability and Resilience

### 3.1 React crash containment

- [x] Add app-level Error Boundary for fatal render/runtime errors.
- [x] Decide fallback UX:
  - [x] show recoverable error panel
  - [x] keep app chrome available if possible
  - [x] include "copy diagnostics" action if diagnostics API exists
- [x] Add tests proving boundary catches child throw and renders fallback.

### 3.2 Stream buffering and cancellation safety (Rust backend)

- [x] Review streaming parser in `src-tauri/src/main.rs` (`ollama_generate_stream`):
  - [x] confirm `buf` cannot grow without bound on malformed/non-newline streams.
  - [x] add upper bound + fail-fast behavior for pathological payloads.
  - [x] preserve cancellation responsiveness.
- [x] Add tests for:
  - [x] normal newline-delimited stream
  - [x] long chunk without newline
  - [x] cancelled stream path

### 3.3 Timeout alignment (frontend vs backend)

- [x] Document and intentionally set timeout strategy:
  - [x] frontend `OLLAMA_REQUEST_TIMEOUT_MS` in `src/lib/ollama.js`
  - [x] backend reqwest timeout in `src-tauri/src/main.rs`
- [x] Ensure behavior is coherent (streaming can be long; health checks should be short).

## 4) Configurability and Runtime UX

### 4.1 Ollama endpoint configuration

- [x] Decide single strategy for endpoint configuration across web + desktop:
  - [x] frontend env (`VITE_OLLAMA_BASE_URL`)
  - [x] backend hardcoded `OLLAMA_ADDR`
- [x] If backend remains fixed localhost, document explicitly in UI/docs. (Not applicable: backend now uses settings-driven endpoint.)
- [x] Preferred: add settings-driven host/port for desktop with safe validation.
- [x] Update CSP/connect-src policy in `src-tauri/tauri.conf.json` accordingly.
- [x] Add validation tests for invalid host/port inputs.

### 4.2 Window defaults and first-run ergonomics

- [x] Reassess default desktop window size in `src-tauri/tauri.conf.json` (currently compact).
  - [x] Updated first-run desktop window to `1100x700` and enabled centered launch.
- [x] Validate on common laptop resolutions and high-DPI displays.
  - [x] `1100x700` fits common laptop viewports (for example `1366x768` and `1440x900`) with room for OS chrome; also fits typical high-DPI effective viewports (for example `1280x800` logical px on Retina-class displays).
- [x] Keep minimum size constraints aligned with UI breakpoints.
  - [x] Set `minWidth: 430` to match the smallest explicit responsive threshold in `src/App.css` (`@media (max-width: 430px)`), and `minHeight: 560` to preserve editor + fixed footer usability.

## 5) Code Quality and Maintainability

### 5.1 Editor keyboard handling cleanup

- [x] Refactor duplicated platform detection and modifier logic in `src/components/Editor.jsx`.
  - [x] Added shared helpers (`isMacPlatform`, `isModShortcut`) and removed duplicated `isMac`/`isMod` blocks from key handling.
- [x] Remove/clarify questionable blocks around event listener setup.
  - [x] Replaced repeated add/remove listener calls with a shared `SELECTION_EVENT_NAMES` list and symmetric setup/cleanup.
- [x] Keep behavior identical; add focused keyboard shortcut tests before/after.
  - [x] Added editor regression tests for macOS modifier behavior (`Meta` works, `Ctrl` does not) in `src/components/Editor.input-behavior.test.jsx`.

### 5.2 Logging hygiene

- [x] Audit `console.warn`/`console.*` usage in runtime-critical paths - errors routed through existing system
- [x] Route meaningful errors through existing reporting/diagnostics channel
- [x] Keep developer diagnostics in dev only where appropriate

### 5.3 Repo hygiene

## 6) Test Coverage Expansion

- [x] Add/expand tests for each fixed bug (minimum one regression test per bug).
- [x] Prioritize tests in:
  - [x] `src/components/*.test.jsx` for UI behavior (`src/components/Editor.input-behavior.test.jsx`, `src/components/AppErrorBoundary.test.jsx`)
  - [x] `src/lib/*.test.js` for pure utility logic (`src/lib/appUtils.test.js`, `src/lib/ollama.test.js`)
  - [x] Rust unit tests in `src-tauri/src/main.rs` where practical (`process_ollama_stream_chunk` + settings validation tests in `main.rs` test module)
- [x] Validate cross-platform keyboard behavior (`Meta` vs `Ctrl`) in editor shortcuts.
- [x] Expand app shortcut coverage for `Meta` parity on shared shortcuts (`Meta+Enter`, `Meta+N`) in `src/App.shortcut.test.jsx`.
- [x] Add smoke test checklist for:
  - [x] open/save/new tab flows (`src/App.ui.test.jsx`, `src/App.desktop-save.test.jsx`)
  - [x] preview open/close and Escape behavior (`src/App.ui.test.jsx`)
  - [x] prompt generation stream + cancel (`src/App.inline-prompts.test.jsx`)

## 7) Release Readiness Gate

- [ ] Run full quality gate from `src/ghost-writer-editor/`:
  - [x] `npm run check`
  - [x] `npm run build:tauri` (or platform-specific build command)
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
- [x] Added regression tests pass locally.
- [x] `npm run check` passes.
- [x] Tauri build passes for intended target(s).
- [ ] Final changelog/release notes mention user-visible fixes.

## 9) Suggested Work Order for a Future Agent

- [ ] Phase 1: high-risk correctness fixes (file size limits, version display, menu typo).
- [ ] Phase 2: resilience (error boundary, stream guardrails, timeout policy).
- [ ] Phase 3: configurability + UX defaults (Ollama settings, window size).
- [ ] Phase 4: cleanup/refactor/tests/docs.
- [ ] Phase 5: release gate + manual QA signoff.
