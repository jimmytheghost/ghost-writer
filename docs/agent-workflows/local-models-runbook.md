# Ghost Writer Local Models Runbook (Tauri + Ollama)

This is the canonical guide for making Ghost Writer load local Ollama models in the Tauri desktop app.

Use this document when:
- the model dropdown says `No models available`
- the status says `Loading Ollama models...` and does not recover
- the app works on one machine but not another
- a developer/agent needs a deterministic bring-up and troubleshooting flow on Windows or macOS

## Scope

This runbook documents the current implementation in this repository:
- desktop model discovery is live at runtime
- the Tauri backend queries Ollama for the current installed models on that machine
- if Ollama is unavailable, the desktop app shows an error and no model options
- snapshot files still exist as build/support artifacts, but they are not the desktop source of truth

It describes the desktop behavior that is in code now.

## How model loading currently works

1. Ghost Writer starts in the Tauri desktop runtime.
2. On app load, the desktop frontend asks the Tauri backend for the current Ollama models.
3. The Tauri backend checks the configured Ollama endpoint and requests the live model list.
4. If Ollama responds successfully, the dropdown is populated with the live installed models from that machine.
5. If Ollama is unavailable, the desktop app clears the picker and shows an error state instead of showing stale models.

Consequence: desktop app correctness no longer depends on checked-in or regenerated snapshot JSON.

## Prerequisites per machine

Install these on each development machine:
- Node.js `>=20.19.0`
- npm
- Rust toolchain (`rustup`, `cargo`, `rustc`) for Tauri
- Ollama (server + CLI)

The desktop runtime must be able to reach Ollama on that machine.
The `ollama` binary should also be available in `PATH` for normal local development and troubleshooting.

## Canonical bring-up (do this in order)

Run from `src/ghost-writer-editor`:

```bash
# 1) Confirm Ollama has models on this machine
ollama list

# 2) Start Ollama if it is not already running
ollama serve

# 3) Start desktop app
npm run dev:tauri
```

If Vite port is busy:

```bash
lsof -ti tcp:5174 | xargs kill 2>/dev/null || true
npm run dev:tauri
```

Windows PowerShell equivalent:

```powershell
Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess |
  Get-Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
npm run dev:tauri
```

## Required validation checks

After launch, validate the desktop app behavior directly:
- the footer model dropdown shows the live installed models from that machine
- the selected model is valid for the current list
- prompt generation succeeds with one of the listed models

If Ollama is intentionally unavailable:
- the dropdown shows no models
- the app shows a clear error message
- non-AI editing still works

## "No models available" troubleshooting

1. Check local models:
   - Run `ollama list`.
   - If empty, install one: `ollama pull llama3.1:8b`.
   - Prefer local models for first validation. Cloud-only tags (for example `*:cloud`) may require account/network setup.
2. Check `ollama` command availability:
   - Run `which ollama` (macOS/Linux) or `where ollama` (Windows).
   - If not found, fix PATH and restart terminal.
3. Check Ollama API reachability:
   - Run `curl http://localhost:11434/api/tags`.
   - Confirm the endpoint responds with the current model list.
4. Fully restart app:
   - Stop Tauri/Vite process.
   - Relaunch `npm run dev:tauri`.
5. If generation fails after models appear:
   - Verify Ollama API directly:

```bash
curl http://localhost:11434/api/tags
```

and:

```bash
curl http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.1:8b","prompt":"ping","stream":false}'
```

6. If API works in browser app but not Tauri:
   - Confirm `VITE_OLLAMA_BASE_URL` is correct for that machine.
   - Default is `http://localhost:11434`.
7. If Ollama is unavailable:
   - The expected desktop behavior is an empty dropdown plus a clear error.
   - The app should not show stale or cached models in the picker.

## Cross-machine behavior (important)

Desktop model loading is now machine-local and live at runtime.

That means:
- moving code or artifacts between machines does not carry over the wrong dropdown contents at runtime
- each machine still needs its own Ollama install and its own local models
- Windows and macOS should each show the models actually installed on that device when the app starts

Snapshot files may still be regenerated during support/build workflows, but they are no longer required to make desktop model loading work correctly.

## Agent handoff checklist

Before claiming a fix for model loading, an agent should provide:
- output summary of `ollama list`
- confirmation that the desktop dropdown showed the live model list on that machine
- confirmation that `npm run dev:tauri` launched without port conflict
- confirmation that the unavailable case shows an error and no stale model options
- one prompt-generation sanity check using a selected model

If any item is missing, the issue is not fully validated.
