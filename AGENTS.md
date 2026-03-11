# Agent Guidelines for Ghost Writer

This file provides guidelines for AI agents working on the Ghost Writer codebase.

## Project Overview

Ghost Writer is a desktop markdown editor built with Tauri, React, and Vite. The main source code lives in `src/ghost-writer-editor/`.

## Build/Lint/Test Commands

All commands must run from `src/ghost-writer-editor/`:

```bash
cd src/ghost-writer-editor

# Development
npm run dev              # Start Vite dev server on port 5174
npm run dev:tauri        # Start Tauri desktop app with Ollama sync

# Building
npm run build            # Build Vite web app
npm run build:tauri      # Build Tauri desktop app
npm run build:tauri:win  # Build Windows NSIS installer
npm run build:tauri:mac  # Build macOS DMG

# Quality checks
npm run lint             # Run ESLint
npm run test             # Run Vitest in watch mode
npm run test:run         # Run Vitest once (single run)
npm run check            # Full check: lint + test:run + build
```

Required Node.js versions:
- `>=20.19.0 <21`
- `>=22.12.0`

Workspace note:
- `src/ghost-writer-editor/package.json` is the app workspace manifest.
- The repo-root `package.json` is repository-level support only.

### Running a Single Test

Use Vitest's `-t` flag to run tests matching a pattern:

```bash
# Run tests matching a pattern
npm run test:run -- -t "spellcheck"

# Run a specific test file
npm run test:run -- src/lib/spellcheck.test.js
```

## Code Style Guidelines

### General

- **Language**: JavaScript (ESM modules, JSX)
- **No TypeScript**: Use JSDoc and default parameter patterns for type hints
- **Node**: ESM via `"type": "module"` in package.json

### Imports

- Use relative imports (`./` or `../`)
- Group imports: external → internal → styles
- Example:
  ```javascript
  import { useCallback, useState } from 'react'
  import { invoke } from '@tauri-apps/api/core'
  import { extractInlinePromptTokens } from '../lib/contentTransforms'
  import Editor from './Editor'
  import './Editor.css'
  ```

### Naming Conventions

- **Components**: PascalCase (e.g., `Editor`, `AppModals`)
- **Hooks**: camelCase with `use` prefix (e.g., `usePromptGeneration`)
- **Utility functions**: camelCase (e.g., `buildGenerationPrompt`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `OVERLAY_HEAVY_TEXT_LIMIT`)
- **Test files**: `filename.test.js`, `filename.test.jsx`, or `filename.feature.test.jsx`

### Component Structure

```jsx
// 1. Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// 2. Constants (file-level)
const CONSTANT_VALUE = 42

// 3. Helper functions (non-component)
function helperFunction() { }

// 4. Component
function ComponentName({ propA, propB = defaultValue }) {
  // Hooks first
  const [state, setState] = useState()
  const memoizedValue = useMemo(() => ..., [deps])
  const handleClick = useCallback(() => ..., [deps])

  // Effects
  useEffect(() => { ... }, [deps])

  // Render
  return (
    <div>...</div>
  )
}

export default ComponentName
```

### Props and Default Values

- Use default parameters for optional props: `propB = false`
- Destructure props in function signature
- Document props with JSDoc when behavior is non-obvious

### Error Handling

- Use async/await with try/catch
- Return error objects with `{ ok: false, error: 'message' }` pattern
- Handle nullish values with optional chaining (`?.`) and nullish coalescing (`??`)

### React Patterns

- Prefer `useMemo` for expensive calculations
- Use `useCallback` for functions passed as callbacks
- Use early returns for conditional rendering
- Use `useRef` for mutable values that don't trigger re-renders
- Clean up effects: return cleanup function from `useEffect`

### Testing

- Use Vitest with jsdom environment
- Use `@testing-library/react` for component tests
- Use `vi.fn()` for mocks, `vi.hoisted()` for module mocks
- Mock Tauri APIs with `vi.mock()`
- Test file naming: `ComponentName.test.jsx`, `someLib.test.js`, or `ComponentName.feature.test.jsx`

Example test structure:
```javascript
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/someModule', () => ({
  someFunction: vi.fn(),
}))

describe('ComponentName', () => {
  it('does something', () => {
    render(<ComponentName />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

### CSS/Styling

- CSS files colocated with components: `Editor.jsx` → `Editor.css`
- Use CSS custom properties for theming
- BEM-like class naming: `block__element--modifier`

### Keyboard Shortcuts

- Use `MetaKey` for macOS (Cmd) and `CtrlKey` for Windows/Linux
- Check with: `const isMac = /Mac/.test(navigator.platform)`
- Combined: `const isMod = isMac ? event.metaKey : event.ctrlKey`

## Important Files

- `src/App.jsx` - Main application component
- `src/components/Editor.jsx` - Core editor component
- `src/hooks/usePromptGeneration.js` - AI prompt generation logic
- `src/lib/ollama.js` - Ollama API client
- `src/lib/desktopRuntime.js` - Tauri desktop runtime bindings
- `src-tauri/src/main.rs` - Native desktop backend, menus, file I/O, print, diagnostics, and Ollama bridge

## Common Development Tasks

### Adding a new feature
1. Create component in `src/components/`
2. Add tests in same directory
3. Import and use in `App.jsx`
4. Run `npm run check` before committing

### Debugging tests
```bash
# Watch mode with UI
npm run test

# Debug specific test
npm run test:run -- --reporter=verbose --filter "test name"
```

### Opening a Pull Request with GitHub CLI

If the user wants the agent to open a PR, `gh` is the fastest route. Run these commands from the repo root, not `src/ghost-writer-editor/`:

```bash
# Confirm gh is installed
gh --version

# Check auth status
gh auth status
```

If `gh auth status` says the token is invalid, re-authenticate with the web flow:

```bash
gh auth login -h github.com --git-protocol https --web
```

### GitHub Auth on This Windows Machine

This repo uses an HTTPS GitHub remote and Windows Git Credential Manager (`credential.helper=manager`). On this machine, the reliable recovery path is:

```bash
# Check whether GitHub CLI auth is still valid
gh auth status

# If the token is invalid, re-authenticate in the browser
gh auth login -h github.com --git-protocol https --web
```

Notes:
- If `git pull` or another authenticated `git` command fails inside the agent sandbox with `couldn't create signal pipe, Win32 error 5` or `failed to execute prompt script`, rerun that `git` command outside the sandbox/escalated. That allows Git Credential Manager to complete normally.
- `gh auth status` can be fixed while `git pull` still fails in-sandbox. Treat those as separate issues: first repair `gh` auth, then rerun `git pull` with escalation if the prompt/helper path is still blocked.
- There is no working fallback token in `GITHUB_TOKEN` or `GH_TOKEN` by default on this machine, so do not assume environment-based GitHub auth exists.
- The successful recovery pattern on March 11, 2026 was: `gh auth status` -> `gh auth login -h github.com --git-protocol https --web` -> rerun `git pull` outside the sandbox.

Then verify the branch and PR state:

```bash
git branch --show-current
gh pr status
```

Create the PR directly from the current branch to `main`:

```bash
gh pr create --base main --head <branch-name> --title "<pr title>" --body "<pr body>"
```

Notes:
- Prefer checking `gh pr status` before creating a PR so you do not duplicate an existing one.
- If the feature branch is already pushed and tracked on `origin`, `gh pr create` works cleanly.
- A local merge into `main` does not mean `origin/main` has the change. Verify with `git log origin/main..<branch-name>` if there is any doubt.
- For this repo, the successful pattern on March 11, 2026 was: fix `gh auth`, confirm no existing PR with `gh pr status`, then run `gh pr create --base main --head <branch-name> ...`.

## Environment Variables

- `VITE_OLLAMA_BASE_URL` - Ollama server URL (default: `http://127.0.0.1:11434`)

## macOS Build Notes

- `npm run build:tauri:mac` goes through `scripts/build-tauri-mac.mjs`, not a raw `tauri build` call.
- When running mac DMG builds from a headless agent or non-Finder session, preserve `CI=true` so the generated `bundle_dmg.sh` skips Finder/AppleScript customization. Forcing `CI=false` can make the build fail after `Running bundle_dmg.sh` even when the app bundle itself succeeded.
- If a DMG build fails late in packaging, inspect `src-tauri/target/<target-triple>/release/bundle/dmg/bundle_dmg.sh` and the surrounding bundle directory first. The common failure mode is the Finder layout step, not Rust compilation.
- macOS GUI apps often do not inherit the shell `PATH`. If Ghost Writer reports `Ollama not found` on macOS, check the Tauri-side fallback paths in `src-tauri/src/main.rs` before assuming Ollama is actually missing.
- Current macOS Ollama fallback locations include `/opt/homebrew/bin/ollama`, `/usr/local/bin/ollama`, `/Applications/Ollama.app/Contents/Resources/ollama`, and `/Applications/Ollama.app/Contents/MacOS/Ollama`.

## Current Repo Notes

- Desktop model loading is live at runtime through the Tauri backend. Snapshot model JSON is support/build plumbing, not the desktop source of truth.
- The active source-of-truth docs are `docs/docs-index.md`, `docs/ghost-writer-todo.md`, and `docs/reference/repo-backup-and-workspace-policy.md`.
- Check `docs/dev-logs/2026/2026-03-07.md` before changing Windows selection/caret behavior; that is the current product direction for the open Windows editor issue.

## Additional Resources

- Start with `docs/docs-index.md` for current canonical docs
- See `docs/agent-workflows/` for focused runbooks on local models, print/PDF, release steps, and QA
- Use `readme.md` as secondary background, not the source of truth for active work
