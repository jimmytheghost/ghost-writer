# Ghost Writer Manual Install Smoke Test (Windows)

Last updated: 2026-03-06

Use this checklist after producing a Windows installer build for Ghost Writer. The goal is to validate the packaged app on a real machine outside the dev workspace before calling a release production-ready.

## Recommended Test Environment

- [ ] Use a clean Windows machine or VM if possible.
- [ ] Prefer a machine that does not already have a Ghost Writer dev build installed.
- [ ] If Ollama-dependent flows are part of the release scope, test once with Ollama available and once with Ollama unavailable.
- [ ] Keep a simple test notes file and record pass/fail results with screenshots for anything unexpected.

## Before You Start

- [ ] Confirm the installer filename and app version match the intended release.
- [ ] Confirm you have the packaged artifacts from `npm run build:tauri:win`.
- [ ] Prepare `small-note.md` with headings, lists, checkboxes, links, and inline prompts like `{{rewrite this}}`.
- [ ] Prepare `large-note.md` with enough content to require scrolling.
- [ ] Prepare one image file referenced from markdown if you want to test local-image preview behavior.

## Install Validation

- [ ] Run the installer normally.
- [ ] Confirm the installer branding, product name, and version are correct.
- [ ] Confirm the app installs without warnings beyond normal Windows prompts.
- [ ] Launch Ghost Writer from the installer's finish step.
- [ ] Close the app.
- [ ] Launch it again from the Start menu.
- [ ] Confirm the app can also be found and launched from the desktop shortcut if one is created.
- [ ] Confirm uninstall entry presence in Windows Apps/Installed Apps.

## First Launch Checks

- [ ] Confirm the window opens centered and at the expected default size.
- [ ] Confirm the app title/branding is correct.
- [ ] Confirm there is one fresh untitled tab on first launch.
- [ ] Confirm there are no obvious missing icons, broken fonts, corrupted characters, or layout glitches.
- [ ] Confirm the footer expands and collapses correctly.
- [ ] Confirm `Ctrl+N` works.
- [ ] Confirm `Ctrl+S` works.
- [ ] Confirm `Ctrl+O` works.
- [ ] Confirm `Ctrl+W` works.
- [ ] Confirm `Ctrl+Shift+W` works.
- [ ] Confirm `Ctrl+F` works.
- [ ] Confirm `Ctrl+M` works.
- [ ] Confirm `Ctrl+Shift+B` works.
- [ ] Confirm `Ctrl+Shift+H` works.
- [ ] Confirm `Ctrl+Shift+D` works.
- [ ] Confirm `Ctrl+P` works.
- [ ] Confirm `Ctrl+T` works.

## Core Release Checks:

- [ ] Windows text selection -> prompt -> replace flow
- [ ] Ollama available vs unavailable startup behavior
- [ ] open/save/save-as/reopen/recent-files tab behavior
- [ ] print/PDF/export flows
- [ ] preview checkbox syncing and markdown rendering edge cases
- [ ] installer launch, relaunch, and first-run feel on both macOS and Windows

## Core Editing Flow

- [ ] Create a new tab.
- [ ] Type plain text, headings, lists, and checkboxes.
- [ ] Confirm tabs mark dirty when content changes.
- [ ] Confirm closing the only tab creates one fresh untitled replacement tab.
- [ ] Open three tabs and confirm closing the active tab selects the nearest remaining tab.
- [ ] Confirm `Ctrl+W` closes the active tab.
- [ ] Confirm `Ctrl+Shift+W` closes all tabs and leaves one fresh tab.
- [ ] Confirm duplicate tab works and preserves content.
- [ ] Confirm rename works for untitled tabs and saved files.
- [ ] Select text in the editor, click into the prompt input, and confirm the app still shows clear selected-text context near the prompt.
- [ ] Confirm Windows does not rely on a blurred in-editor selection text overlay after focus leaves the editor.

## Save/Open/File Handling

- [ ] Save a new untitled file.
- [ ] Confirm the tab title updates to the saved file name.
- [ ] Edit the file again and save to the same path.
- [ ] Use Save As and save a copy to a second location.
- [ ] Open an existing markdown file from the native dialog.
- [ ] Confirm recent-files behavior works if exposed through the menu.
- [ ] Confirm canceling Save As is non-destructive.
- [ ] Confirm canceling Open is non-destructive.
- [ ] Confirm canceling Rename is non-destructive.
- [ ] Confirm canceling close when prompted for dirty content is non-destructive.

## Dirty-State / Close Protection

- [ ] Modify a saved file without saving.
- [ ] Try closing the tab.
- [ ] Confirm the dirty-close prompt appears.
- [ ] Choose cancel in the save dialog and confirm the tab remains open with unsaved content intact.
- [ ] Repeat and choose save, then confirm the tab closes.
- [ ] Open multiple dirty tabs and attempt Close All.
- [ ] Attempt to close the main window with dirty tabs.
- [ ] Attempt to quit the app with dirty tabs.
- [ ] Confirm unsaved-work protection is consistent across all three paths.

## Session Restore

- [ ] Open multiple tabs.
- [ ] Leave a mix of saved and unsaved tabs.
- [ ] Set one non-first tab active.
- [ ] Quit the app normally.
- [ ] Reopen the app.
- [ ] Confirm all expected tabs are restored.
- [ ] Confirm unsaved content is restored.
- [ ] Confirm saved-file tabs reopen with paths.
- [ ] Confirm the previously active tab is restored.

## Preview / Scroll / Markdown Behavior

- [ ] Load `large-note.md`.
- [ ] Scroll deep into the editor.
- [ ] Toggle markdown preview.
- [ ] Confirm preview opens at the matching scroll position.
- [ ] Scroll inside preview.
- [ ] Exit preview.
- [ ] Confirm editor scroll restores to the latest preview position.
- [ ] Repeat across multiple tabs and confirm scroll positions stay isolated per tab.
- [ ] Click markdown checkboxes in preview and confirm the source markdown updates correctly.
- [ ] Click a safe external link and confirm it opens in the system browser.
- [ ] Confirm inline prompt tokens display or hide according to the current setting.

## Find / Replace

- [ ] Open Find & Replace with `Ctrl+F`.
- [ ] Search for a single word.
- [ ] Search for a multi-word phrase.
- [ ] Test next navigation.
- [ ] Test previous navigation.
- [ ] Test replace once.
- [ ] Test replace all.
- [ ] Test case-sensitive toggle.
- [ ] Confirm selection and caret behavior remain correct after replacements.

## Export / Print

- [ ] Test Copy to clipboard.
- [ ] Test Copy HTML.
- [ ] Test Copy Rich Text.
- [ ] Export HTML.
- [ ] Export RTF.
- [ ] Export LaTeX.
- [ ] Export Word-Compatible HTML.
- [ ] Export diagnostics.
- [ ] Open print flow and confirm printable content looks correct.
- [ ] If PDF export relies on print flow, confirm the generated PDF is readable and complete.

## Settings / Preferences

- [ ] Change theme.
- [ ] Change text zoom.
- [ ] Toggle always-on-top.
- [ ] Toggle default preview/startup options if applicable.
- [ ] Toggle spellcheck.
- [ ] Add a custom dictionary word.
- [ ] Disable a custom word entry if supported.
- [ ] Restart the app and confirm all settings persist.
- [ ] Confirm menu labels stay in sync with the actual view state.

## Prompt / Ollama Flows

Run this section only if the release includes prompt-generation functionality.

### With Ollama Available

- [ ] Select text in the editor before opening the prompt input.
- [ ] Confirm the selected-text context shown near the prompt matches the intended edit target.
- [ ] Confirm the model list loads automatically at app launch.
- [ ] Confirm the dropdown reflects the models currently installed on that Windows machine.
- [ ] Submit a short prompt.
- [ ] Confirm the generation rewrites the previously selected text, not the wrong range.
- [ ] Confirm streaming output appears in the active tab.
- [ ] Cancel a running generation.
- [ ] Confirm undo/redo generation controls work if enabled.
- [ ] Confirm switching tabs during or after generation does not corrupt content.

### With Ollama Unavailable

- [ ] Launch the app while Ollama is stopped.
- [ ] Confirm the app does not crash.
- [ ] Confirm the user sees a clear error state.
- [ ] Confirm the model dropdown shows no stale or cached models.
- [ ] Confirm non-AI editing features still work normally.

## Diagnostics / Logging

- [ ] Trigger at least one handled warning path if practical.
- [ ] Export diagnostics from the app.
- [ ] Confirm the diagnostics file is created successfully.
- [ ] Confirm log content is present and readable.
- [ ] Confirm repeated app launches do not break logging.

## Uninstall / Reinstall

- [ ] Uninstall Ghost Writer.
- [ ] Confirm the uninstall completes cleanly.
- [ ] Reinstall the same version.
- [ ] Confirm the app still launches and basic flows work.
- [ ] Decide whether settings/session persistence after uninstall is acceptable for your release policy.

## Release Signoff Criteria

Do not call the release production-ready until all of the following are true:

- [ ] Installer builds and installs successfully.
- [ ] App launches from installed shortcuts/menu entries.
- [ ] Core editing, save/open, preview, close protection, and session restore all pass.
- [ ] Export/print flows pass at least one smoke test each.
- [ ] Prompt/Ollama flows pass for both available and unavailable cases if they are in scope.
- [ ] No user-facing crashes, corrupted text, or obvious UI regressions were observed.
- [ ] Any failures are either fixed or explicitly accepted and documented before release.
- [ ] Windows selected-text prompt context is clear and stable during editor-to-prompt transitions.

## Suggested Result Template

```md
## Manual Install Smoke Test Result

- [ ] Build tested:
- [ ] Machine/OS tested:
- [ ] Installer path:
- [ ] Install passed: yes/no
- [ ] Core editing passed: yes/no
- [ ] Save/open passed: yes/no
- [ ] Dirty-close protection passed: yes/no
- [ ] Session restore passed: yes/no
- [ ] Preview/scroll sync passed: yes/no
- [ ] Export/print passed: yes/no
- [ ] Ollama available passed: yes/no/not tested
- [ ] Ollama unavailable passed: yes/no/not tested
- [ ] Diagnostics export passed: yes/no
- [ ] Uninstall/reinstall passed: yes/no
- [ ] Blocking issues found:
- [ ] Final signoff:
```
