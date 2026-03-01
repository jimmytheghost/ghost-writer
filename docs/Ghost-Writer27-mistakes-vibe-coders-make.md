# Ghost Writer - Vibe Code Check

Below are 27 mistakes that "vibe coders" make while making applications.  Ghost Writer is absolutely a "vibe coded" application and considering I know absolutely nothing about code or a code or how to program, I was likely to make many of these mistakes.

So I ran them through an audit with an agent and lo and behold. I do have many of the mistakes that need to be fixed.

The goal is to go through them one by one, one at a time, with commits and pushes after each is successfully checked off the list.

---

[x] 1. API keys hardcoded “for now”
    -  Hardcoded API keys
    -  Mistake #1 audit is complete (no hardcoded API keys found in source; only false positives in docs/build artifacts). Please send mistake #2.

[x] 2. No /health endpoint, you just hit the homepage
    -  When your App is web-based with API
    -  Mistake #2 result: this repo is a desktop Tauri app (not a long-running HTTP API service), and I found no server framework/routes at all—so lacking `/health` is not an issue here. `/health` endpoints matter for deployable backend services (load balancers, k8s probes, uptime monitors), not local desktop UI apps. Ready for mistake #3?

[x] 3. Schema changes live in your head, not migrations
    -  When your app has a Database Layer
    -  Mistake #3 audit complete: **Not evident in this repo**. I found no database layer (no Prisma/Drizzle/Sequelize/TypeORM, no SQL schema files, no migration folders). This app persists settings/files via Tauri commands and local app state, so classic DB schema migrations don’t currently apply. If you later add a real DB (SQLite/Postgres), then yes—add versioned migrations immediately. Ready for mistake #4?

[x] 4. Every query is SELECT * and vibes
    -  If you app uses SQL
    -  Mistake #4 audit complete: **Not evident in this repo**. I found zero SQL usage (`SELECT *`, query builders, DB drivers, or DB code in Rust/JS), so there are no `SELECT *` queries to optimize. This concern applies once you add a relational DB; then prefer explicit column lists, filters, limits, and indexes. Ready for mistake #5?

[x] 5. Error handling = console.log(e) and hope
    -  Proper Error Handling
    -  Mistake #5 fix complete: **Standardized.** Added `src/lib/errorReporting.js` with `toUserMessage()`, `report()`, and `setReportFn()`. All `desktopRuntime.js` catch blocks now call `report(error, contextFallback)` so the real error is normalized and shown in the UI (prompt error area). App registers the reporter once with `setPromptError`. Graceful fallbacks (return null/false) kept; users now see the actual failure message instead of silent or generic feedback. Ready for mistake #6?

[x] 6. No rate limit on auth or writes
    -  For Auth Systmes
    -  Mistake #6 result: **Not evident / not applicable in current architecture.** I found no auth system (no login/password/session auth flows) and no public HTTP write endpoints—this is a local Tauri desktop app. So classic server-side rate limiting on auth/writes isn’t a pressing repo risk right now. If you later expose a network API, add per-IP/user rate limits for login, prompt-generation writes, and file-write endpoints (with 429 + retry headers). Ready for mistake #7?

[x] 7. UTC, local time, and “JS default” all mixed
    - Date / Time Business Logic
    - Mistake #7 result: **Not evident in this repo.** I found no real date/time business logic (no UTC/local conversions, no persisted timestamps, no formatting paths mixing zones). Current `Date.now()` usage is only for cache-busting and ephemeral IDs/refresh signals, which is timezone-agnostic. So this “mixed UTC/local/default JS” risk isn’t currently a concern here. If you later add timestamped data, standardize on UTC storage + explicit display formatting by user locale/timezone. Ready for mistake #8?

[x] 8. README is empty or wrong
    - Updated README
    - Mistake #8 result: **Not evident.** Your READMEs are populated and mostly consistent with actual scripts/features (`dev`, `dev:tauri`, `build:tauri*`, `sync:models`, shortcuts, requirements). So this is not an “empty or wrong README” repo. Minor optional improvement only: add a short troubleshooting section (common Ollama/Tauri failures). Ready for mistake #9?

[x] 9. No staging env, just “dev” and “prod-ish”
    -  Mistake #9 verified: **Not applicable for current scope.** In the app workspace, I found `dev`, `preview`, and build/release scripts plus `.env`/`.env.example`, but no explicit staged environment tier/config (no `.env.staging`, staging scripts, or staging deployment profile). For a local-first desktop app this is usually lower risk than web backends, so it’s not urgent—but if you plan wider distribution, add a formal release channel model (e.g., dev/beta/stable with separate config + signing/update feeds). Ready for mistake #10?

[x] 10. One god component owns the whole screen
     -  Mistake #10 fix complete: **Refactored.** `App.jsx` now composes domain hooks: **useTabsSession** (tabs, selection/scroll/streaming, session restore/persist, auto-save, tab CRUD) and **useAppSettings** (settings, theme, view toggles, modal state, updateSetting, applySettings). Side effects (desktop load/persist/autosave) live in useTabsSession; App remains the composition shell with file/find/preview handlers. Ready for mistake #11.

[x] 11. No analytics, just “feels like people use it”
     -  Verified: **N/A.** Local desktop app; no backend to instrument. Ready for #12.

[x] 12. You say “we’ll clean this up after launch” every week
     -  Checked off: cleaning up now (vibe-code check, refactors, error handling, .gitignore). Ready for #13.

[x] 13. Env vars live only on your laptop, nowhere else documented
     -  Mistake #13 result: **Not evident (mostly handled well).** Env vars are documented and not laptop-only: `src/ghost-writer-editor/.env.example` exists, `VITE_OLLAMA_BASE_URL` is documented in `src/ghost-writer-editor/README.md`, and actual code usage is explicit in `src/lib/ollama.js`. There is one optional override (`TAURI_MAC_TARGET`) also documented in README/script. So you’re in good shape here. Ready for mistake #14?

[x] 14. Frontend talks directly to 5 different third-party APIs with no wrapper
     -  Mistake #14 result: **Not evident.** I found a small number of external interactions, and they are mostly wrapped/centralized: Ollama requests go through `src/lib/ollama.js` (`buildOllamaUrl`, `fetchWithTimeout`) and are consumed by hooks; model snapshot fetch is internal (`/ollama-models.json`); spellcheck dictionary fetches are local bundled assets with fallback logic. This is not “frontend directly talking to 5 third-party APIs with no wrapper.” Ready for mistake #15?

[x] 15. No monitoring or alerts – you find out it’s down from a DM
     -  Mistake #15 result: **Partially present, but mostly not applicable to your current architecture.** I found no external monitoring/alerting stack (Sentry/Datadog/Uptime/PagerDuty), so for an internet-facing service this would be a gap. But Ghost Writer is a local-first desktop app, not a hosted always-on backend, so “app is down” alerting is less critical. You do have local health/error surfacing (`setPromptError`, model load status, `ensure_ollama_running`, Tauri emits/errors), which helps users self-diagnose. If you later add cloud services, add uptime checks + error tracking + alert routing immediately.

```  
     -  Minimal future cloud monitoring plan (lean + high impact):

    1) **Health endpoints**
    - Add `/healthz` (process alive) and `/readyz` (dependencies reachable).
    - Include checks for model backend connectivity + storage.
    
    2) **Error tracking**
    - Add Sentry (or equivalent) in API + frontend.
    - Capture unhandled exceptions, failed requests, and release version.
    
    3) **Core metrics + dashboards**
    - Track: request rate, error rate, p95 latency, generation success/failure, queue depth.
    - Dashboard by environment (dev/beta/prod) with last deploy markers.
    
    4) **Synthetic uptime checks**
    - Ping key routes every 1 min from 2+ regions.
    - Validate a simple generate request, not just HTTP 200.
    
    5) **Alerting rules (actionable only)**
    - Page on: sustained 5xx > 5%, p95 latency spike, dependency outage, uptime check failures.
    - Slack-only for warning thresholds/noise.
    
    6) **Runbook + ownership**
    - One-page incident runbook (where to look, how to rollback, who owns on-call).
    - Add contact/escalation matrix.
    
    7) **Release safety**
    - Add deploy canary + rollback trigger tied to error/latency SLOs.
    
    If you implement just these 7, you’ll avoid the “found out from a DM” problem without over-engineering.
    
```

[ ] 16. Logs only exist in your local terminal history
     -  Mistake #16 result: **Partially present.** Runtime logs are mostly ephemeral (`console.warn` in frontend and `eprintln!` in Tauri), so yes—many diagnostics currently live in terminal/devtools output rather than a structured persisted log pipeline. You *do* have strong written dev logs/runbooks in `docs/`, but those are project journals, not runtime telemetry. Best later fix: add a tiny structured logger with rotating file output on desktop (e.g., app data dir), include timestamp/severity/context, and expose “Copy diagnostics” in-app for support. 

```json
{
  "ts": "2026-03-01T19:55:00.123Z",
  "level": "info|warn|error",
  "event": "ollama.request.failed",
  "msg": "Human-readable summary",
  "app": { "name": "ghost-writer", "version": "0.1.3", "env": "desktop" },
  "runtime": { "platform": "macos", "arch": "arm64" },
  "session": { "id": "sess_abc123", "tabId": "tab-..." },
  "op": { "name": "generate", "durationMs": 842, "ok": false },
  "err": { "type": "NetworkError", "code": "ECONNREFUSED", "stack": "...optional..." },
  "ctx": { "model": "llama3.1:8b", "pathHash": "sha256:..." }
}
```

**Rules (keep it lean):**
- Required fields: `ts`, `level`, `event`, `msg`.
- Never log raw document content, prompts, API keys, or full file paths (hash/redact).
- Rotate files (e.g., 10 MB x 5 files), store in app data dir.
- Add `diag_bundle` export (recent logs + app metadata) for support.


[x] 17. DB backups are “automatic”… but you’ve never tested a restore
    -  Mistake #17 result: **Not applicable in this repo right now.** I found no database layer at all (no Postgres/SQLite/Supabase/Firebase or migration tooling), so DB backup/restore risk does not currently apply. Your persistence is local files/settings, not relational DB state. If you later add a DB, immediately add: scheduled backups + documented restore runbook + quarterly restore drill with RTO/RPO targets. 
 
[x] 18. Feature flags = commenting code in and out
    -  Mistake #18 result: **Not evident.** I found no signs of feature delivery by commenting code in/out. Your toggles are real runtime behaviors (UI/view toggles, settings toggles, menu toggles), not ad-hoc commented blocks. I also found no TODO/TEMP comment patterns indicating manual code-comment flagging. If you later need release flags, add a small typed flag registry (env + persisted settings) rather than ad-hoc conditionals.

[ ] 19. Deploys are done from your local machine with one random script
    -  Mistake #19 result: **Partially present.** You do have defined/repeatable npm scripts for build/release (`build:tauri`, `build:tauri:win`, `build:tauri:mac`) and CI exists (`.github/workflows/ci.yml`), so it’s **not** “one random script.” But release packaging still appears largely machine-local/manual (run from a developer machine), which is a risk for reproducibility/signing/provenance. Best later fix: move release builds to CI with pinned toolchain, artifact signing, and release promotion workflow.
    
```
Minimal CI release pipeline blueprint (GitHub Actions):

1) **Trigger model**
- `pull_request`: lint/test/build only.
- `push main`: nightly/dev artifacts (unsigned optional).
- `tag v*`: production release pipeline.

2) **Build matrix**
- macOS runner: build/sign/notarize DMG.
- Windows runner: build/sign NSIS/EXE.
- (Optional) Linux AppImage/deb.

3) **Deterministic setup**
- Pin Node + Rust toolchain versions.
- Cache npm/cargo dependencies.
- Run `npm ci`, `npm run check`, `npm run sync:models`.

4) **Release build jobs**
- `npm run build:tauri:mac` / `build:tauri:win`.
- Generate checksums (SHA256) for every artifact.
- Produce SBOM + provenance/attestation (if possible).

5) **Signing & notarization**
- Use GitHub Environments + protected secrets.
- macOS: codesign + notarize + staple.
- Windows: Authenticode sign.

6) **Publish step**
- Create GitHub Release from tag.
- Upload signed artifacts + checksums + changelog notes.
- Mark as draft first; manual approve to publish.

7) **Promotion safety**
- Required checks before release job starts.
- Concurrency lock to prevent parallel releases.
- Rollback path: yank release + re-point “latest”.

```

[ ] 20. No input validation, you trust whatever the client sends
    - Mistake #20 result: **Mostly not evident (with minor gaps).** I found substantial validation both in frontend and Tauri command layer: URL allowlisting (`is_allowed_external_url` / `isSafeMarkdownUrl`), file/path checks (`trim`, empty checks, `.md` extension enforcement, file existence/type checks), input normalization (`ensureMarkdownFileName`, `normalizeTextZoom`), and file-size guards before loading. So this is not a “trust whatever client sends” codebase. Minor hardening opportunity: add explicit max-length/range checks for some command payloads (e.g., very large strings/arrays) and stricter schema validation at command boundaries.

```
Top 3 command-boundary validations to add in `src-tauri/src/main.rs`:

1) **Payload size caps (DoS guard)**
- Add hard limits for `content` and prompt fields (e.g., 2–5 MB per string).
- Reject oversized `paths` arrays and per-path length (e.g., max 100 items, 4KB/path).

2) **Canonical path boundary checks (file safety)**
- For write/rename/load commands, canonicalize paths and enforce allowed roots (user-selected path or app-owned directories).
- Block traversal/symlink edge cases where relevant.

3) **Strict typed schema + range checks for settings/command args**
- Validate enums (`theme`, etc.), numeric bounds (`autoSaveIntervalSeconds`, zoom), and string allowlists.
- Fail fast with explicit error codes/messages instead of permissive fallback in command handlers.

These 3 changes give the biggest security/reliability gain with minimal complexity.
```

[x] 21. CORS is set to * because “it fixed the error”
    -  Mistake #21 result: **Not evident.** I found no CORS middleware/headers and no `Access-Control-Allow-Origin: *` configuration in the repo. This app is Tauri desktop + local Ollama calls, not a browser-hosted public API with server CORS policy. Also, your Tauri CSP is restrictive and explicitly scoped (`connect-src` includes only self/ipc and local Ollama hosts), which is the opposite of wildcard permissiveness. Ready for mistake #22?

[x] 22. CI is “I ran it once locally and it worked”
    -  Mistake #22 result: **Not evident.** You have real CI in GitHub Actions (`.github/workflows/ci.yml`) running on PRs and main pushes with automated checks: Node setup + `npm ci` + `npm run check` in `src/ghost-writer-editor`, plus a separate macOS `tauri-smoke` job running `cargo check --locked`. That is materially beyond “I ran it once locally.” Optional next hardening is to add release-branch/tag gates, artifact uploads, and required status checks before merge. 

[x] 23. Same API token reused across staging, prod, and local
    - Mistake #23 result: **Not evident in this repo.** I found no API tokens/secrets being used at all (this app talks to local Ollama via base URL), so there’s no evidence of a single token reused across staging/prod/local. The only env var present is `VITE_OLLAMA_BASE_URL` in `.env`/`.env.example`, which is non-secret endpoint config. If you later introduce real API credentials, enforce per-environment secrets immediately (separate keys + scopes + rotation). 

[x] 24. Only one person actually knows how to run or deploy the app
    - Verified: **Mostly not evident.** README and `docs/agent-workflows/` runbooks document run, test, and build. Remaining risk: release is still local/manual; optional later: CI release + runbook (see checklist below). (`readme.md`, `src/ghost-writer-editor/README.md`, and multiple runbooks under `docs/agent-workflows/`) that clearly explain how to run, test, and build the app. That strongly reduces “only one person knows.” The remaining risk is release execution still appears somewhat founder/local-machine centered (especially packaging/signing flow), so formalizing a step-by-step release runbook + CI-driven release path would remove most of the remaining single-operator dependency.

```
- Here’s a concise **bus-factor reduction checklist** you can apply:

1) **Codify release ownership**
- Define primary + secondary release owner.
- Document escalation path if one is unavailable.

2) **CI-first releases**
- Move packaging/signing/notarization to GitHub Actions.
- No “only from one laptop” release path.

3) **Single source runbooks**
- One canonical release runbook (prereqs, commands, rollback, verification).
- Keep it versioned and reviewed like code.

4) **Access redundancy**
- At least 2 maintainers with access to repo, CI secrets, signing credentials, stores.
- Use org-managed credential vault, not personal keychains only.

5) **Rotation drills**
- Quarterly “someone else runs the release” dry run.
- Capture gaps and update docs immediately.

6) **Operational observability docs**
- Troubleshooting matrix: symptom → likely cause → fix.
- Include log locations, health checks, and known failure modes.

7) **Definition of done for maintainability**
- New feature isn’t “done” until docs/tests/runbook updates are merged.

If you implement these 7, bus-factor risk drops fast without much overhead.
```

[x] 25. API keys / JWT secrets stored in client-side code or .env committed to git 
    - Mistake #25 result: **Mostly not evident (good posture right now).** I found no API keys/JWT secrets in client code, and `.env` currently only contains `VITE_OLLAMA_BASE_URL` (non-secret local endpoint config). Your root `.gitignore` excludes `.env`/`.env.*`, and `git ls-files` produced no tracked entries for `src/ghost-writer-editor/.env` or `.env.example` in this repo snapshot, so there’s no evidence of committed secrets. One hygiene improvement: add an explicit `.env` ignore in `src/ghost-writer-editor/.gitignore` too (defense in depth for subdir workflows).

```
    
**Secret-scanning pre-commit checklist (practical + fast):**

1) **Stage-aware scan before commit**
- Scan only staged diff first (fast, relevant).
- Block commit on high-confidence secret patterns.

2) **Repo-wide scan in CI**
- Run full-history or full-tree secret scan on PRs/main.
- Fail CI for verified leaks.

3) **Pattern coverage**
- Include generic secrets (API keys, JWTs, private keys, tokens).
- Add custom org patterns (vendor-specific keys, internal prefixes).

4) **Allowlist discipline**
- Use explicit, reviewed allowlist entries for false positives.
- Never broad-ignore whole files/directories unless necessary.

5) **.env hygiene**
- Ensure `.env`, `.env.*`, credential files are gitignored at all repo levels.
- Keep `.env.example` values non-secret placeholders only.

6) **Developer UX**
- Provide one command (`npm run secrets:scan` or pre-commit hook).
- Clear remediation output: file, line, why flagged, how to rotate.

7) **Incident response if leaked**
- Revoke/rotate immediately.
- Purge from git history if needed.
- Document incident + prevention update.

**Minimal tooling combo:** `gitleaks` (pre-commit + CI) with a small custom config.
```

[x] 26. Supabase/Firebase/Postgres exposed publicly with no RLS → full database readable via /rest/v1/ endpoint
    - Verified: **Not applicable.** No Supabase/Firebase/Postgres or DB layer; local-first app. Ready for #27.

[ ] 27. Zero logging beyond console.log → good luck debugging
    - Mistake #27 result: **Partially present.** You’re not at absolute “zero logging” (there are useful `console.warn` paths in the frontend and `eprintln!` paths in Tauri), but logging is still mostly unstructured and ephemeral (terminal/devtools), with no persistent rotating log files or centralized event model. So debugging can become difficult across machines/sessions.

```
**Best course of action:** implement a lightweight structured logging layer for desktop runtime: JSONL logs in app data dir, log levels (`info/warn/error`), event names, timestamps, session IDs, and redaction rules (no prompt/document content/secrets). Add rotation (e.g., 10 MB × 5 files), and expose a “Copy diagnostics” / “Export diagnostics” action in-app. This addresses #27 and strengthens #16/#15 concerns too.
```