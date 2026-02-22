@echo off
setlocal
set OLLAMA_PORT=11434

echo Checking Ollama on port %OLLAMA_PORT%...
netstat -ano | findstr ":%OLLAMA_PORT%" >nul
if errorlevel 1 (
  where ollama >nul 2>&1
  if errorlevel 1 (
    echo Ollama is not installed or not on PATH.
    pause
    exit /b 1
  )

  echo Ollama is not running. Starting Ollama...
  start "Ollama" cmd /c "ollama serve"

  set OLLAMA_READY=
  for /l %%i in (1,1,20) do (
    netstat -ano | findstr ":%OLLAMA_PORT%" >nul
    if not errorlevel 1 (
      set OLLAMA_READY=1
      goto :ollama_ready
    )
    timeout /t 1 /nobreak >nul
  )
  :ollama_ready
  if not defined OLLAMA_READY (
    echo Ollama did not become ready in time.
  ) else (
    echo Ollama started successfully.
  )
)

cd /d "%~dp0src\ghost-writer-editor" || (
  echo Failed to change directory to src\ghost-writer-editor
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed or not on PATH.
  echo Please install Node.js 20.19+ or 22.12+ and try again.
  pause
  exit /b 1
)

where cargo >nul 2>&1
if errorlevel 1 (
  echo Rust toolchain is not installed or not on PATH.
  echo Please install Rust (rustup, cargo, rustc) and try again.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -p "process.versions.node"') do set NODE_VER=%%v
node -e "const v=process.versions.node.split('.').map(Number); const ok=(v[0]===20 && v[1]>=19) || (v[0]===22 && v[1]>=12) || (v[0]>22); process.exit(ok?0:1);"
if errorlevel 1 (
  echo Your Node.js version is %NODE_VER%.
  echo Vite requires Node.js 20.19+ or 22.12+.
  echo Please upgrade Node.js and try again.
  pause
  exit /b 1
)

echo Installing dependencies (if needed)...
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)

echo Starting dev server...
start "Ghost Writer Dev Server" cmd /k "npm run dev:tauri"

echo Waiting for the dev server to start...
timeout /t 3 /nobreak >nul

echo Dev server is running in a separate window.
pause

endlocal
