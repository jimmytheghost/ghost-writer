# GitHub Release Runbook

This runbook defines the CI-first release path for Ghost Writer desktop bundles.

## Scope

- Workflow file: `.github/workflows/release.yml`
- Trigger: push tag matching `v*` (example: `v0.1.4`)
- Targets:
  - macOS DMG (`aarch64-apple-darwin` and `x86_64-apple-darwin`)
  - Windows NSIS EXE (`x86_64-pc-windows-msvc`)

## Release model

1. `quality-gate` runs `npm run check` on Ubuntu.
2. `build-release` runs a matrix build on macOS + Windows with pinned toolchains.
3. Each matrix job generates SHA256 checksums and uploads artifacts.
4. `publish-release` creates a draft GitHub Release and attaches:
   - DMG/EXE bundles
   - checksum files

Release publishing is intentionally draft-first. A maintainer must review and publish.

## Required repo setup

1. Create GitHub Environment `production-release`.
2. Require manual reviewers for `production-release`.
3. Add branch/tag protection so only approved tags are pushed.
4. Set `contents: write` permission for Actions (repo setting).

## Required secrets (mandatory for macOS release)

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

The macOS release jobs fail immediately if any of these secrets are missing.

## How to cut a release

1. Ensure `main` is green in CI.
2. Create and push a semver tag:

```bash
git tag v0.1.4
git push origin v0.1.4
```

3. Open the Actions run for `Release`.
4. Verify all matrix builds succeeded and checksum files were generated.
5. Verify macOS build logs include successful:
   - `codesign --verify`
   - `xcrun stapler validate`
   - `spctl -a -vv -t open` output with `accepted` and `Notarized Developer ID`
6. Open the draft release and verify attached files.
7. Publish the release draft.

## Artifact verification

Before publishing, verify checksums locally:

```bash
shasum -a 256 <artifact-file>
```

Match output against the uploaded `sha256-*.txt`.

For each macOS DMG, validate signing/notarization locally:

```bash
codesign --verify --verbose=2 <artifact.dmg>
xcrun stapler validate <artifact.dmg>
spctl -a -vv -t open <artifact.dmg>
```

## Rollback

1. If draft release is wrong: delete the draft and rerun with a new tag.
2. If a published release is wrong:
   - mark the release as pre-release or delete it,
   - create a corrective tag/release (`vX.Y.Z+1`),
   - document the reason in release notes.

## Ownership

- Primary owner: release manager for current sprint.
- Secondary owner: backup maintainer with Actions + secrets access.

A release is not complete until both owners can execute this runbook.
