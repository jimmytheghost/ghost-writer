# Repo Backup And Workspace Policy

Last reviewed: 2026-03-06

## Workspace Ownership

Ghost Writer uses two `package.json` files with different roles:

- `src/ghost-writer-editor/package.json` is the app workspace manifest.
  - Owns app versioning (`1.4.15`), scripts, and dependencies for development/build/test/release.
  - All contributor commands should run from `src/ghost-writer-editor/`.
- `package.json` at repo root is not the app workspace manifest.
  - Treat it as repository-level support only.
  - Do not add app runtime or build dependencies there.

## Backup Directories

Two backup directories may exist in this repository:

- `src/ghost-writer-editor/.backups/`
  - Legacy snapshot folder from early local development.
  - Not required by runtime, build, or release pipelines.
- `_backups/` (repo root)
  - Local scratch backups for manual edits/recovery.
  - Explicitly gitignored and local-only.

## Shipping And Release Policy

- Backup directories are local workflow artifacts and must not be shipped as release content.
- Desktop bundles are produced from `src/ghost-writer-editor/src-tauri/target/release/bundle`.
- CI/release commands should target `src/ghost-writer-editor/` scripts only.

## Contributor Checklist

- Run commands from `src/ghost-writer-editor/`.
- Add/update app dependencies only in `src/ghost-writer-editor/package.json`.
- Keep backup folders out of release assets and PR scope unless explicitly needed for migration cleanup.
