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

## Pull request expectations

- Keep changes focused and small.
- Include a clear summary of what changed and why.
- Include screenshots for UI changes.
- Note any security implications when touching markdown rendering or Ollama request logic.
- Update `CHANGELOG.md` for user-facing changes.
