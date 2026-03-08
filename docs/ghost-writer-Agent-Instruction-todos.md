# Ghost Writer Agent Instruction: Process Issues Checklist

## Read Before Starting

1. **DO NOT DELETE ANY DOC FILES**. All documentation must be preserved in git.
2. Track progress by marking checkboxes in `ghost-writer-todo.md`
3. Reference `ghost-writer-todo.md` as the single source of truth for active work
## Your Workflow
### Step 1: Understand the Scope
- Read `ghost-writer-todo.md` to see what work is currently open
- Check `docs-index.md` if you need the documentation map
### Step 2: Plan Your Changes
For each issue:
1. Determine if it's safe to fix or needs more context
2. Check if fixing requires other changes
3. Plan the smallest change that addresses the issue
### Step 3: Make Changes
- Fix the code/config as needed
- Keep changes minimal and focused
- If you need to make multiple related changes, group them logically
### Step 4: Update Checkboxes
After completing a task:
1. Find the corresponding task in `ghost-writer-todo.md`
2. Mark it with `[x]` (green check)
3. DO NOT delete any files - preserve documentation
### Step 5: Validate
- When finished, run `npm run check` from `src/ghost-writer-editor/`
- If build fails, review what you changed and fix
- Only move to next task when current task passes
## Important Rules
- **Never delete docs**. Even if you consolidate issues, keep the history.
- **Check boxes as you go**. Document your progress immediately.
- **Small, focused commits**. Don't make giant changes in one go.
- **If uncertain, ask**. Don't make assumptions about undocumented behavior.
## Stop and Report
After completing a phase or encountering blockers:
1. Update checkboxes in `ghost-writer-todo.md`
2. Summarize what was fixed
3. Note any issues that need clarification
## Done
You're done when:
- All checkboxes in relevant phase are marked
- `npm run check` passes
- All documentation is preserved
