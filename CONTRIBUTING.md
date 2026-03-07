# Contributing to Ghost Writer

## Development setup

1. Install Node.js `20.19+`.
2. Run:

```bash
cd src/ghost-writer-editor
npm ci
npm run dev
```

## Before opening a PR

Run all checks locally:

```bash
cd src/ghost-writer-editor
npm run check
```

## CI cost-control policy

This repository is configured for zero automatic GitHub Actions spend:

- Workflow runs are manual only (`workflow_dispatch`).
- No CI jobs run automatically on `push`, `pull_request`, or tag creation.

To keep quality standards professional without hosted CI, contributors must run local checks before every push:

```bash
cd src/ghost-writer-editor
npm run check
```

For automated CI without GitHub-hosted billing, use a self-hosted runner (macOS required for DMG automation).

## Pull request expectations

- Keep changes focused and small.
- Include a clear summary of what changed and why.
- Include screenshots for UI changes.
- Note any security implications when touching markdown rendering or Ollama request logic.
- Update `CHANGELOG.md` for user-facing changes.
