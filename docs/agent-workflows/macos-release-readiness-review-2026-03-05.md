# macOS Release Readiness Review (2026-03-05)

## Scope

Review target:

- `src/ghost-writer-editor` macOS build and release path
- Tauri runtime security posture relevant to macOS desktop release
- CI release workflow and release runbook alignment

Validation executed:

- `PATH="/opt/homebrew/bin:$PATH" npm run check`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `PATH="/opt/homebrew/bin:$PATH" npm run build:tauri:mac`
- `spctl -a -vv <generated dmg>`

## Findings

### 1) High: Asset protocol scope is too broad for production

The app currently allows asset protocol access to the entire user home directory.

Evidence:

- `src/ghost-writer-editor/src-tauri/tauri.conf.json`
  - `app.security.assetProtocol.scope` includes `"$HOME/**"`
- `src/ghost-writer-editor/src-tauri/src/main.rs`
  - setup code calls `asset_protocol_scope().allow_directory(home_dir, true)`

Risk:

- Expands file exposure surface beyond what is needed for normal app behavior.
- Increases impact radius if any renderer/content safety boundary is bypassed.

Recommendation:

- Restrict asset protocol scope to the minimum required paths.
- Remove blanket home-directory grant and use explicit, least-privilege allowlists.

### 2) High: Signing/notarization are not enforced as release gates

Release docs and workflow permit unsigned output if secrets/config are not present.

Evidence:

- `docs/agent-workflows/release-runbook.md`
  - states builds may still produce unsigned artifacts if secrets are missing
- `.github/workflows/release.yml`
  - sets optional signing/notarization-related env vars but does not fail if missing
  - no explicit post-build `codesign`, notarization, stapling, or `spctl` gate step
- Local verification of produced DMG:
  - `spctl` reported: `rejected` / `source=no usable signature`

Risk:

- Non-notarized or unsigned artifacts can reach draft release state.
- End users may hit Gatekeeper warnings/blocks; trust and install friction increase.

Recommendation:

- Add hard CI checks that fail release builds when signing/notarization validation fails.
- Validate each macOS artifact before upload/publication.

### 3) Medium: CI macOS release target is Intel-only

The release matrix currently builds macOS bundle for `x86_64-apple-darwin` only.

Evidence:

- `.github/workflows/release.yml`
  - macOS matrix rust target is `x86_64-apple-darwin`
  - artifact glob points only to Intel output path

Risk:

- Apple Silicon users may run under translation or require separate artifact handling.
- Misses opportunity to ship native arm64 (or universal) first-class binaries.

Recommendation:

- Add arm64 or universal strategy in release matrix and artifact publication rules.

### 4) Low: Test suite has React `act(...)` warning

Checks passed, but one warning surfaced in shortcut tests.

Evidence:

- During `npm run check`, warning emitted from `src/App.shortcut.test.jsx` about state updates not wrapped in `act(...)`.

Risk:

- Possible hidden timing/race behavior not captured cleanly in tests.

Recommendation:

- Clean up warning to reduce flaky behavior risk and improve test signal quality.

### 5) Informational: Local Node version gating can block contributors

`npm run check` fails on unsupported Node versions until PATH/runtime is corrected.

Evidence:

- Project requires Node `>=20.19.0 <21 || >=22.12.0`.
- Local default `/usr/local/bin/node` was `v20.16.0`; checks passed only when using supported Node from `/opt/homebrew/bin`.

Risk:

- Local false negatives and inconsistent developer experience.

Recommendation:

- Keep `.nvmrc`/tooling docs explicit and ensure onboarding points to required Node version.

## What Passed

- Frontend quality gate passed with supported Node:
  - lint: pass
  - tests: `121` tests passed
  - web build: pass
- Rust tests passed:
  - `10` unit tests passed in `src-tauri/src/main.rs`
- macOS DMG build command completed successfully and produced a DMG artifact.

## Implementation Status Update (2026-03-05)

Completed in repo:

- Tightened asset scope by removing static home-directory access and replacing runtime scope grants with per-document parent-directory grants.
- Enforced macOS signing/notarization release gates in CI, including required secret checks and post-build `codesign` / `stapler` / `spctl` validation.
- Expanded macOS release architecture coverage to both `aarch64-apple-darwin` and `x86_64-apple-darwin`.
- Removed the React `act(...)` warning in keyboard shortcut tests and re-ran `npm run check` + `cargo test`.

Still required before production declaration:

- Manual install/launch validation on both Apple Silicon and Intel hardware.
- One full tag-to-draft release dry run in GitHub Actions.
- Release-owner confirmation of environment protections and secret availability.

Execution aids added:

- Hardware QA checklist: `docs/agent-workflows/macos-hardware-release-qa-checklist.md`
- CI dry-run checklist: `docs/agent-workflows/release-dry-run-checklist.md`
- Owner/secrets checklist: `docs/agent-workflows/release-owner-readiness-checklist.md`

## Pre-Release Checklist (from findings)

Use this as a release gate checklist before shipping macOS as production-ready.

### Security hardening

- [x] Replace `"$HOME/**"` asset protocol scope with minimal required paths.
- [x] Remove/replace runtime blanket `allow_directory(home_dir, true)` with least-privilege path grants.
- [ ] Re-test file open/save/export and preview flows after scope tightening.

### Signing and notarization enforcement

- [x] Define release policy: signed + notarized + stapled artifacts are mandatory.
- [x] Add CI fail-fast checks for required Apple/Tauri signing secrets in release jobs.
- [x] Add post-build verification steps (`codesign` validation, notarization status, stapling validation, Gatekeeper `spctl` assessment).
- [x] Fail build/release job if any verification step fails.
- [x] Document failure handling and rerun procedure in release runbook.

### Architecture coverage

- [x] Decide artifact strategy: arm64-only, x86_64 + arm64, or universal.
- [x] Update release matrix to produce chosen macOS architecture set.
- [x] Update checksum and artifact upload globs for all published macOS targets.
- [ ] Verify install + launch behavior on both Apple Silicon and Intel machines.
  - Hardware test checklist: `docs/agent-workflows/macos-hardware-release-qa-checklist.md`

### Test and quality signal

- [x] Resolve React `act(...)` warning in shortcut tests.
- [x] Re-run `npm run check` and `cargo test` after changes.
- [ ] Execute one full CI tag-to-draft release dry run.

### Release docs and operations

- [x] Update `docs/agent-workflows/release-runbook.md` so unsigned release output is explicitly disallowed.
- [x] Add explicit macOS verification commands and expected pass outputs to runbook.
- [ ] Confirm release owners have secrets and environment protections configured.

## Current Recommendation

Status today: **close, but not yet production-ready** for macOS release.

Minimum blockers before calling production-ready:

1. Asset scope hardening
2. Enforced signing/notarization validation gates
