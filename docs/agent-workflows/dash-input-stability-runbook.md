# Dash Input Stability Runbook (No Auto-Conversion)

This runbook documents the dash-input bug we fixed and the rules to prevent regressions.

## Required behavior

In the editor, dash characters must remain exactly what the user typed:
- `-` stays `-`
- `--` stays `--`
- `---` stays `---`
- no caret jump
- no replacement to `—` or `–`

Markdown preview can still render a horizontal rule when the literal markdown input is `---`.

## Bug symptom (repro)

1. Type `-- example`
2. Press `Space` after `example`
3. Broken behavior (old): caret jumps backward near the dashes and text is rewritten to em dash forms

The same occurred with `---`.

## Root cause

The issue came from a mix of native and app-level behavior:
- macOS smart substitutions can emit replacement input around word boundaries (often on space)
- browser/input pipeline may send em/en dash characters or replacement events
- prior editor logic rewrote dash sequences and moved caret positions

Any one of those can mutate text or move caret; together they caused the visible jump/regression.

## Implemented fix

File: `src/ghost-writer-editor/src/components/Editor.jsx`

1. Intercept literal dash input in `keydown` and insert `-` manually with explicit caret update.
2. Intercept literal space input in `keydown` (`' '`, `Spacebar`, `code === Space`) and insert space manually.
3. Block smart replacement events in `onBeforeInput` when `inputType === insertReplacementText`.
4. Block direct `—` / `–` beforeinput data insertions.
5. Keep a defensive `onChange` fallback that restores prior hyphen runs (`--`, `---`) if replacement slips through.

## Tests

File: `src/ghost-writer-editor/src/components/Editor.input-behavior.test.jsx`

Coverage includes:
- `--` remains literal
- `--` replacement attempts are restored
- `---` replacement attempts are restored
- space key path uses literal insertion (critical boundary for macOS substitution timing)

Run:

```bash
cd src/ghost-writer-editor
npm run test:run -- src/components/Editor.input-behavior.test.jsx
```

## Guardrails for future changes

1. Do not add any smart-dash normalization feature in the editor input path.
2. Do not remove the manual `-` and `Space` key handling unless replacement behavior is proven safe on macOS.
3. Do not rely on `autoCorrect="off"` alone to stop all native substitutions.
4. If changing textarea input logic, run manual QA on macOS with `-- example` and `--- example` followed by space.
5. Keep input behavior tests updated when touching `handleKeyDown`, `onBeforeInput`, or `handleTextareaChange`.

## Manual QA checklist (must pass)

1. Typing `-`, `--`, and `---` leaves text unchanged.
2. Typing `-- example` then pressing space at end does not jump caret.
3. Typing `--- example` then pressing space at end does not jump caret.
4. Markdown preview still renders horizontal rule for intentional `---` markdown input.
