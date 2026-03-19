# PR Triage and Merge Safety Runbook

Use this runbook when processing multiple open pull requests so merge/close decisions are explicit and safe.

## Mode A: One-by-One With Explicit Confirmation

```text
Work only in the current existing checkout. Do not clone, do not create a worktree, and do not use any other repo copy.

Goal:
Process the currently open PRs one by one, with my approval required before every single action.

Hard safety rules:
- Do NOT merge or close any PR without my explicit confirmation for that exact PR.
- Do NOT bulk-merge or bulk-close.
- If uncertain, stop and ask.
- Do NOT delete branches unless I explicitly ask.
- Prefer leaving a PR open over closing it by mistake.

Step-by-step workflow:
1) Fetch latest remote + PR state.
2) List all currently OPEN PRs to target branch `main` (oldest first), with:
   - PR # and title
   - head branch
   - mergeability/conflicts
   - CI/check status
   - whether commits are already in `main`
   - whether likely superseded by another PR/commit (with evidence)
3) Pick only the first PR in that ordered list and present a recommendation:
   - MERGE
   - LEAVE_OPEN
   - CLOSE_AS_SUPERSEDED (only if strong evidence)
4) STOP and ask me for one explicit command for that PR only:
   - `merge #<n>`
   - `close #<n>`
   - `skip #<n>`
5) Execute only that one command.
6) Report result for that PR (what changed, SHA/link/status).
7) Move to the next PR and repeat from step 3 until no open PRs remain or I say stop.

Closing rule:
- Never close a PR just because it is old or has overlap.
- Close only when I explicitly command `close #<n>`.
- When closing, post a reason comment referencing superseding PR/commit SHA.

Per-PR output format (every round):
- PR: #<n> <title>
- Recommendation: <MERGE | LEAVE_OPEN | CLOSE_AS_SUPERSEDED>
- Evidence: <1-3 concise bullets>
- Awaiting command: `merge #<n>` / `close #<n>` / `skip #<n>`
```

## Mode B: Full Review First, Then User Confirmation

```text
Work only in the current existing checkout. Do not clone, do not create a worktree, and do not use any other repo copy.

Goal:
Review all currently open PRs, provide recommendations for each, then stop for my confirmation/notes before taking any action.

Hard safety rules:
- Do NOT merge or close anything until I explicitly approve.
- Do NOT perform bulk actions automatically.
- Do NOT delete branches unless I explicitly ask.
- If evidence is incomplete or ambiguous, mark it and ask.

Required process:
1) Fetch latest remote and PR metadata.
2) Identify all OPEN PRs targeting `main` (or the branch I specify).
3) For each PR, collect:
   - PR # and title
   - head branch
   - mergeability/conflicts
   - CI/check status
   - whether commits are already contained in target branch
   - possible superseded relationship (with evidence: PR links and/or commit SHAs)
4) Produce a full recommendation table for ALL open PRs using exactly:
   - RECOMMEND_MERGE
   - RECOMMEND_LEAVE_OPEN
   - RECOMMEND_CLOSE_AS_SUPERSEDED
5) For every RECOMMEND_CLOSE_AS_SUPERSEDED, include concrete evidence (superseding PR # and commit SHA(s)).
6) STOP and wait for my response.

Decision input format I will send:
- `approve all`
- or per PR directives like:
  - `merge #12`
  - `leave open #14`
  - `close #18`
  - plus optional notes

Execution phase (only after my confirmation):
- Apply exactly my directives.
- If my directive conflicts with safety checks (for example merge blocked by conflicts), stop on that PR and report.
- After execution, provide final report with:
  - merged PRs + resulting SHA
  - closed PRs + reason/comment
  - left-open PRs + reason
  - any failures/blockers
```

## Operational Notes

- Run PR triage commands from repo root (not `src/ghost-writer-editor/`).
- Check `gh auth status` before PR operations.
- Prefer explicit evidence over heuristics for superseded PR decisions.
