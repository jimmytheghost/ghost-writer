# macOS Hardware Release QA Checklist

Use this checklist on both supported architectures before publishing a production macOS release.

## Test matrix

- [ ] Apple Silicon machine (`arm64`)
- [ ] Intel machine (`x86_64`)

## Preconditions

- [ ] Correct DMG selected for machine architecture.
- [ ] Machine is on a clean user session (no prior dev build running).
- [ ] Internet available for notarization/Gatekeeper checks.

## Gatekeeper and notarization checks

Run on each machine:

```bash
spctl -a -vv -t open /path/to/GhostWriter.dmg
xcrun stapler validate /path/to/GhostWriter.dmg
```

Expected:

- [ ] `spctl` output includes `accepted`.
- [ ] `spctl` output includes `Notarized Developer ID`.
- [ ] `stapler validate` reports a valid ticket.

## Install and first launch

- [ ] Mount DMG and drag app to `/Applications`.
- [ ] Launch from Finder (not Terminal).
- [ ] No unexpected security warning beyond standard first-open prompt.
- [ ] App reaches editor UI without crash/hang.

## Core file workflow regression pass

Perform all checks on each machine.

- [ ] Create new note and save to local disk.
- [ ] Reopen saved note.
- [ ] Save-as to a different directory.
- [ ] Rename file via app rename flow.
- [ ] Open file from outside home folder (for example `/tmp` or project directory).
- [ ] Confirm preview rendering works for opened file.
- [ ] Export/print flow completes and output opens correctly.

## Keyboard and session behaviors

- [ ] Print shortcut works (`Cmd+P`).
- [ ] Close/reopen app and verify recent files list is correct.
- [ ] Reopen a recent file and confirm content integrity.

## Report template

Fill once per machine.

- Architecture:
- macOS version:
- DMG file name:
- Result: Pass / Fail
- Failures observed:
- Screenshots/logs captured:
- Tester/date:

## Exit criteria

- [ ] Both architectures pass all checklist items.
- [ ] Any failures are either fixed and re-tested or formally accepted as release-blocking.
