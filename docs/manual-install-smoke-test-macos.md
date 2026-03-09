# Ghost Writer Manual Install Smoke Test (macOS)

Last updated: 2026-03-06

Use this checklist after producing a macOS app bundle, DMG, or installer build for Ghost Writer. The goal is to validate the packaged app on a real machine outside the dev workspace before calling a release production-ready.

## Recommended Test Environment

- [ ] Use a clean macOS machine or VM if possible.
- [ ] Prefer a machine that does not already have a Ghost Writer dev build installed.
- [ ] If Ollama-dependent flows are part of the release scope, test once with Ollama available and once with Ollama unavailable.
- [ ] Keep a simple test notes file and record pass/fail results with screenshots for anything unexpected.

## Before You Start

- [ ] Confirm the app package filename and app version match the intended release.
- [ ] Confirm you have the packaged artifacts from `npm run build:tauri:mac`.
- [ ] Prepare `small-note.md` with headings, lists, checkboxes, links, and inline prompts like `{{rewrite this}}`.
- [ ] Prepare `large-note.md` with enough content to require scrolling.
- [ ] Prepare one image file referenced from markdown if you want to test local-image preview behavior.

## Install Validation

- [ ] Mount or open the packaged macOS artifact.
- [ ] Confirm the app branding, product name, and version are correct.
- [ ] If distributed via DMG, drag Ghost Writer into `/Applications`.
- [ ] If Gatekeeper warns on first launch, confirm the warning behavior matches the release-signing state you expect.
- [ ] Launch Ghost Writer from Applications or from the mounted artifact if that is part of the test.
- [ ] Close the app.
- [ ] Launch it again from Launchpad, Spotlight, or Finder.
- [ ] Confirm the app can be found in `/Applications` after install if that is the intended install path.

## First Launch Checks

- [ ] Confirm the window opens centered and at the expected default size.
- [ ] Confirm the app title/branding is correct.
- [ ] Confirm there is one fresh untitled tab on first launch.
- [ ] Confirm there are no obvious missing icons, broken fonts, corrupted characters, or layout glitches.
- [ ] Confirm the footer expands and collapses correctly.
- [ ] Confirm `Cmd+N` works.
- [ ] Confirm `Cmd+S` works.
- [ ] Confirm `Cmd+O` works.
- [ ] Confirm `Cmd+W` works.
- [ ] Confirm `Cmd+Shift+W` works.
- [ ] Confirm `Cmd+F` works.
- [ ] Confirm `Cmd+M` works.
- [ ] Confirm `Cmd+Shift+B` works.
- [ ] Confirm `Cmd+Shift+H` works.
- [ ] Confirm `Cmd+Shift+D` works.
- [ ] Confirm `Cmd+P` works.
- [ ] Confirm `Cmd+T` works.

## Core Editing Flow

- [ ] Create a new tab.
- [ ] Type plain text, headings, lists, and checkboxes.
- [ ] Confirm tabs mark dirty when content changes.
- [ ] Confirm closing the only tab creates one fresh untitled replacement tab.
- [ ] Open three tabs and confirm closing the active tab selects the nearest remaining tab.
- [ ] Confirm `Cmd+W` closes the active tab.
- [ ] Confirm `Cmd+Shift+W` closes all tabs and leaves one fresh tab.
- [ ] Confirm duplicate tab works and preserves content.
- [ ] Confirm rename works for untitled tabs and saved files.
- [ ] Select text in the editor, click into the prompt input, and confirm the persistent in-editor selection highlight remains visible and aligned.

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
- [ ] Attempt to quit the app with dirty tabs using the app menu or `Cmd+Q`.
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
- [ ] Click a safe external link and confirm it opens in the default system browser.
- [ ] Confirm inline prompt tokens display or hide according to the current setting.

## Find / Replace

- [ ] Open Find & Replace with `Cmd+F`.
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
- [ ] Confirm the persistent in-editor selection highlight still clearly shows the intended edit target.
- [ ] Confirm the model list loads automatically at app launch.
- [ ] Confirm the dropdown reflects the models currently installed on that Mac.
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

- [ ] Remove Ghost Writer from `/Applications` or use the release-specific uninstall flow if one exists.
- [ ] Confirm the app removal completes cleanly.
- [ ] Reinstall the same version.
- [ ] Confirm the app still launches and basic flows work.
- [ ] Decide whether settings/session persistence after reinstall is acceptable for your release policy.

## Release Signoff Criteria

Do not call the release production-ready until all of the following are true:

- [ ] App package mounts, copies, or installs successfully.
- [ ] App launches from Applications, Launchpad, Finder, or Spotlight as intended.
- [ ] Core editing, save/open, preview, close protection, and session restore all pass.
- [ ] Export/print flows pass at least one smoke test each.
- [ ] Prompt/Ollama flows pass for both available and unavailable cases if they are in scope.
- [ ] No user-facing crashes, corrupted text, or obvious UI regressions were observed.
- [ ] Any failures are either fixed or explicitly accepted and documented before release.
- [ ] macOS persistent in-editor selection highlight remains visually correct during editor-to-prompt transitions.

## Suggested Result Template

```md
## Manual Install Smoke Test Result

- [ ] Build tested:
- [ ] Machine/OS tested:
- [ ] Package path:
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
