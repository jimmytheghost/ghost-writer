# Ghost Writer Manual Install Smoke Test

Last updated: 2026-03-06

Use this checklist after producing a Windows installer build for Ghost Writer. The goal is to validate the packaged app on a real machine outside the dev workspace before calling a release production-ready.

## Recommended Test Environment

- Use a clean Windows machine or VM if possible.
- Prefer a machine that does not already have a Ghost Writer dev build installed.
- If Ollama-dependent flows are part of the release scope, test once with Ollama available and once with Ollama unavailable.
- Keep a simple test notes file and record pass/fail results with screenshots for anything unexpected.

## Before You Start

- Confirm the installer filename and app version match the intended release.
- Confirm you have the packaged artifacts from `npm run build:tauri:win`.
- Prepare two markdown files for testing:
  - `small-note.md` with headings, lists, checkboxes, links, and inline prompts like `{{rewrite this}}`
  - `large-note.md` with enough content to require scrolling
- Prepare one image file referenced from markdown if you want to test local-image preview behavior.

## Install Validation

1. Run the installer normally.
2. Confirm the installer branding, product name, and version are correct.
3. Confirm the app installs without warnings beyond normal Windows prompts.
4. Launch Ghost Writer from the installer's finish step.
5. Close the app.
6. Launch it again from the Start menu.
7. Confirm the app can also be found and launched from the desktop shortcut if one is created.
8. Confirm uninstall entry presence in Windows Apps/Installed Apps.

## First Launch Checks

- Confirm the window opens centered and at the expected default size.
- Confirm the app title/branding is correct.
- Confirm there is one fresh untitled tab on first launch.
- Confirm there are no obvious missing icons, broken fonts, corrupted characters, or layout glitches.
- Confirm the footer expands and collapses correctly.
- Confirm keyboard shortcuts work:
  - `Ctrl+N`
  - `Ctrl+S`
  - `Ctrl+O`
  - `Ctrl+W`
  - `Ctrl+Shift+W`
  - `Ctrl+F`
  - `Ctrl+M`
  - `Ctrl+Shift+B`
  - `Ctrl+Shift+H`
  - `Ctrl+Shift+D`
  - `Ctrl+P`
  - `Ctrl+T`

## Core Editing Flow

1. Create a new tab.
2. Type plain text, headings, lists, and checkboxes.
3. Confirm tabs mark dirty when content changes.
4. Confirm closing the only tab creates one fresh untitled replacement tab.
5. Open three tabs and confirm closing the active tab selects the nearest remaining tab.
6. Confirm `Ctrl+W` closes the active tab.
7. Confirm `Ctrl+Shift+W` closes all tabs and leaves one fresh tab.
8. Confirm duplicate tab works and preserves content.
9. Confirm rename works for untitled tabs and saved files.

## Save/Open/File Handling

1. Save a new untitled file.
2. Confirm the tab title updates to the saved file name.
3. Edit the file again and save to the same path.
4. Use Save As and save a copy to a second location.
5. Open an existing markdown file from the native dialog.
6. Confirm recent-files behavior works if exposed through the menu.
7. Confirm non-destructive cancel behavior:
   - cancel Save As
   - cancel Open
   - cancel Rename
   - cancel close when prompted for dirty content

## Dirty-State / Close Protection

1. Modify a saved file without saving.
2. Try closing the tab.
3. Confirm the dirty-close prompt appears.
4. Choose cancel in the save dialog and confirm the tab remains open with unsaved content intact.
5. Repeat and choose save, then confirm the tab closes.
6. Open multiple dirty tabs and attempt Close All.
7. Attempt to close the main window with dirty tabs.
8. Attempt to quit the app with dirty tabs.
9. Confirm unsaved-work protection is consistent across all three paths.

## Session Restore

1. Open multiple tabs.
2. Leave a mix of saved and unsaved tabs.
3. Set one non-first tab active.
4. Quit the app normally.
5. Reopen the app.
6. Confirm session restore brings back:
   - all expected tabs
   - unsaved content
   - saved-file tabs with paths
   - the active tab

## Preview / Scroll / Markdown Behavior

1. Load `large-note.md`.
2. Scroll deep into the editor.
3. Toggle markdown preview.
4. Confirm preview opens at the matching scroll position.
5. Scroll inside preview.
6. Exit preview.
7. Confirm editor scroll restores to the latest preview position.
8. Repeat across multiple tabs and confirm scroll positions stay isolated per tab.
9. Click markdown checkboxes in preview and confirm the source markdown updates correctly.
10. Click a safe external link and confirm it opens in the system browser.
11. Confirm inline prompt tokens display or hide according to the current setting.

## Find / Replace

1. Open Find & Replace with `Ctrl+F`.
2. Search for a single word.
3. Search for a multi-word phrase.
4. Test next/previous navigation.
5. Test replace once.
6. Test replace all.
7. Test case-sensitive toggle.
8. Confirm selection and caret behavior remain correct after replacements.

## Export / Print

1. Test Copy to clipboard.
2. Test Copy HTML.
3. Test Copy Rich Text.
4. Export HTML.
5. Export RTF.
6. Export LaTeX.
7. Export Word-Compatible HTML.
8. Export diagnostics.
9. Open print flow and confirm printable content looks correct.
10. If PDF export relies on print flow, confirm the generated PDF is readable and complete.

## Settings / Preferences

1. Change theme.
2. Change text zoom.
3. Toggle always-on-top.
4. Toggle default preview/startup options if applicable.
5. Toggle spellcheck.
6. Add a custom dictionary word.
7. Disable a custom word entry if supported.
8. Restart the app and confirm all settings persist.
9. Confirm menu labels stay in sync with the actual view state.

## Prompt / Ollama Flows

Run this section only if the release includes prompt-generation functionality.

### With Ollama Available

1. Confirm the model list loads.
2. Submit a short prompt.
3. Confirm streaming output appears in the active tab.
4. Cancel a running generation.
5. Confirm undo/redo generation controls work if enabled.
6. Confirm switching tabs during or after generation does not corrupt content.

### With Ollama Unavailable

1. Launch the app while Ollama is stopped.
2. Confirm the app does not crash.
3. Confirm the user sees a clear error state.
4. Confirm non-AI editing features still work normally.

## Diagnostics / Logging

1. Trigger at least one handled warning path if practical.
2. Export diagnostics from the app.
3. Confirm the diagnostics file is created successfully.
4. Confirm log content is present and readable.
5. Confirm repeated app launches do not break logging.

## Uninstall / Reinstall

1. Uninstall Ghost Writer.
2. Confirm the uninstall completes cleanly.
3. Reinstall the same version.
4. Confirm the app still launches and basic flows work.
5. Decide whether settings/session persistence after uninstall is acceptable for your release policy.

## Release Signoff Criteria

Do not call the release production-ready until all of the following are true:

- Installer builds and installs successfully.
- App launches from installed shortcuts/menu entries.
- Core editing, save/open, preview, close protection, and session restore all pass.
- Export/print flows pass at least one smoke test each.
- Prompt/Ollama flows pass for both available and unavailable cases if they are in scope.
- No user-facing crashes, corrupted text, or obvious UI regressions were observed.
- Any failures are either fixed or explicitly accepted and documented before release.

## Suggested Result Template

Use a short release note like this after testing:

```md
## Manual Install Smoke Test Result

- Build tested:
- Machine/OS tested:
- Installer path:
- Install passed: yes/no
- Core editing passed: yes/no
- Save/open passed: yes/no
- Dirty-close protection passed: yes/no
- Session restore passed: yes/no
- Preview/scroll sync passed: yes/no
- Export/print passed: yes/no
- Ollama available passed: yes/no/not tested
- Ollama unavailable passed: yes/no/not tested
- Diagnostics export passed: yes/no
- Uninstall/reinstall passed: yes/no
- Blocking issues found:
- Final signoff:
```
