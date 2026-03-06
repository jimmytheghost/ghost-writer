# macOS Release Packet

This packet defines the execution order for declaring macOS production release readiness.

## Execution order

1. Owner and environment readiness
   - Complete: `docs/agent-workflows/release-owner-readiness-checklist.md`
2. CI dry run (tag to draft release)
   - Complete: `docs/agent-workflows/release-dry-run-checklist.md`
3. Hardware validation on both architectures
   - Complete: `docs/agent-workflows/macos-hardware-release-qa-checklist.md`
4. Final release runbook execution
   - Execute: `docs/agent-workflows/release-runbook.md`

## Release gate rules

A production macOS release is allowed only when all are true:

- Owner/secrets checklist is fully complete.
- CI dry run passed with both macOS architectures and verification checks green.
- Hardware QA passed on Apple Silicon and Intel.
- No open release-blocking defects from QA or CI.

## Evidence bundle (attach to release ticket)

- Completed owner readiness checklist
- CI dry-run workflow URL
- Screenshots/log excerpts showing notarization checks passed (`codesign`, `stapler`, `spctl`)
- Completed hardware QA checklist for both machines
- Final release workflow URL

## Sign-off

- Primary owner:
- Secondary owner:
- QA owner:
- Date:
- Release tag:
