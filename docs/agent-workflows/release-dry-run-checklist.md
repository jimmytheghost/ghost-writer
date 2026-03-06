# Release CI Dry Run Checklist

Run this once before declaring macOS production-ready.

## Purpose

Validate end-to-end tag -> matrix build -> draft release flow without publishing.

## Steps

1. Ensure `main` is green and all required secrets/protections are configured.
2. Create a disposable dry-run tag (example: `v0.1.4-rc.1`).
3. Push the tag to origin.
4. Open GitHub Actions `Release` workflow run.
5. Confirm `quality-gate` passes.
6. Confirm both macOS matrix jobs pass:
   - `aarch64-apple-darwin`
   - `x86_64-apple-darwin`
7. Confirm Windows job passes.
8. Confirm macOS log checks pass:
   - `codesign --verify`
   - `xcrun stapler validate`
   - `spctl ...` reports `accepted` and `Notarized Developer ID`
9. Open generated draft release and verify artifact set + checksums.
10. Do not publish the dry-run release.

## Cleanup

- Delete dry-run draft release.
- Delete dry-run tag locally and on origin.

## Exit criteria

- End-to-end workflow is green.
- Artifacts are complete and correctly named.
- No manual interventions were required to pass signing/notarization checks.
