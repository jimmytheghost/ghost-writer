# Print + PDF Runbook (Desktop/Tauri)

This runbook documents how Ghost Writer printing works and where to make safe changes.

## Scope

- Covers `Print` (`Cmd/Ctrl+P`) and `Export -> PDF...`.
- Applies to desktop builds (Tauri).
- Goal: print output should look like Markdown Preview with stable, Word-like page margins.

## Current Architecture

1. Frontend prepares print markup from rendered markdown:
   - `src/ghost-writer-editor/src/lib/print.js`
2. Frontend asks desktop runtime to open native print:
   - `src/ghost-writer-editor/src/lib/desktopRuntime.js`
3. Tauri command invokes native print API:
   - `src/ghost-writer-editor/src-tauri/src/main.rs` (`print_current_webview`)
4. `Export PDF...` uses a separate desktop command:
   - Windows: `export_pdf_current_webview` writes a PDF via WebView2 `PrintToPdf`
   - macOS: `Export PDF...` still falls back to the print dialog path

`Print` and `Export PDF...` share the frontend print preparation, but PDF export is no longer coupled to browser preview success.

## Critical Rules

1. Do not rely on CSS alone for macOS top/bottom page spacing.
   - Page margins must be controlled in native print info on macOS.
2. Do not clean up print DOM/styles immediately after invoking desktop print.
   - Keep print DOM active until `afterprint` (plus timeout fallback).
3. Keep print content generation tied to preview markup.
   - Print container uses preview styling classes for visual consistency.
4. Keep PDF export separate from preview rendering on Windows.
   - The PDF command should only depend on the prepared print DOM, not on preview UI behavior.

## macOS Margin Source of Truth

File: `src/ghost-writer-editor/src-tauri/src/main.rs`  
Command: `print_current_webview`

Current values (points; 72 pt = 1 in):
- Top: `30.0`
- Right: `50.0`
- Bottom: `78.0`
- Left: `50.0`

If spacing needs tuning, change these values first.

## Frontend Lifecycle Source of Truth

File: `src/ghost-writer-editor/src/lib/print.js`

Key behavior:
- Adds temporary print root + print style.
- Uses `preview__content` class on print article for preview-like typography.
- Defers cleanup with `afterprint` + timeout fallback.
- Uses longer desktop fallback timeout to avoid style teardown during long native dialogs.
- Guards against overlapping desktop print jobs.
- Prepares the same print DOM for PDF export, but PDF export uses the dedicated desktop command on Windows.

## Known Failure Modes

1. Printed page shows app shell/faded UI instead of document:
   - Cleanup happened too early.
2. Top/bottom spacing ignores CSS tweaks:
   - Native print margins override browser-style expectations on macOS.
3. Crash/freeze from custom native print bridge:
   - Avoid unsafe/custom WKWebView print casting paths unless strictly required.

## Verification Checklist

After any print change:

1. Run:
   - `npm run test:run`
   - `npm run build`
   - `cargo check` in `src-tauri`
2. Build desktop app:
   - `npm run build:tauri:mac`
3. Manual QA:
   - Print from `Cmd/Ctrl+P`
   - Export `PDF...`
   - Confirm first page top/bottom spacing is balanced
   - Confirm output resembles Markdown Preview styling
   - Confirm no freeze/crash and no partial app-frame capture

