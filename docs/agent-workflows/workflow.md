## Project Workflow

This document outlines the workflow for developing the `ghost-writer` project.

**Project Files:**
*   **Project Overview:** `/Users/jimmytheghost/AI-Local-Stack/ghost-writer/readme.md`
*   **Dev-Log:** `/Users/jimmytheghost/AI-Local-Stack/ghost-writer/docs/dev-logs/2026` (latest version)
*   **Local Model Runbook:** `/Users/jimmytheghost/AI-Local-Stack/ghost-writer/docs/agent-workflows/local-models-runbook.md`
*   **Print/PDF Runbook:** `/Users/jimmytheghost/AI-Local-Stack/ghost-writer/docs/agent-workflows/print-and-pdf-runbook.md`
*   **Dash Input Stability Runbook:** `/Users/jimmytheghost/AI-Local-Stack/ghost-writer/docs/agent-workflows/dash-input-stability-runbook.md`
*   **Backups:** `/Users/jimmytheghost/AI-Local-Stack/ghost-writer/_backups`
*   **Backup + Workspace Policy:** `/Users/jimmytheghost/AI-Local-Stack/ghost-writer/docs/reference/repo-backup-and-workspace-policy.md`

**Familiarization:** Before beginning work, please read the files above to understand the current state.

**Workflow Steps:**

1.  **Request:** I (the human) will request a test or code change.
2.  **Implement:** You (the agent) will:
    *   Backup all files you are about to modify significantly *before* making changes.
    *   Implement the change as instructed.
    *   If you encounter ambiguity or make an incorrect assumption, *stop* and request clarification instead of proceeding.
    *   If changes impact other features or shared components, note this in the log and suggest areas for testing to ensure stability.
    *   Before reporting completion, perform a self-check: Does the code adhere to project patterns? Are there any obvious errors? Should any linters or formatters be run?
3.  **Update Log:**
    *   Annotate or summarize changes/tests in the dev log or changelog.
    *   Log changes spanning multiple files as a single atomic unit (e.g., "Modified X, Y, and Z to implement feature ABC").
    *   For individual file changes, log each file with a brief description of what was modified, rather than just a high-level summary.
    *   Explicitly log any new packages, dependencies, or external libraries added: "Added package X (version Y) for feature Z."
4.  **Report Results:** I will run tests or review and report back actual results, bugs, or failures.
5.  **Repeat:** Iterate through these steps as needed for refinement or additional tasks.
6.  **Finalization:** When complete, make any final updates to the dev log.

**Important Reminder:** Always back up files before making significant modifications.
