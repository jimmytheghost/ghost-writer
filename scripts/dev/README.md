# Dev Launch Scripts

These scripts are local development helpers for launching or stopping the Tauri dev app.

- Windows launcher: `launch-dev.bat`
- macOS launcher: `launch.command`
- POSIX shell launcher: `launch-dev.sh`
- macOS stop helper: `stop.command`

All scripts assume they are run from this directory and target:

- `../../src/ghost-writer-editor`

Use canonical npm commands directly if you prefer:

```bash
cd src/ghost-writer-editor
npm run dev:tauri
```
