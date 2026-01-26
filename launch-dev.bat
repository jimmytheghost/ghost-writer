@echo off
setlocal

cd /d "%~dp0src\wraider-editor" || (
  echo Failed to change directory to src\wraider-editor
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
start "Wraider Dev Server" cmd /k "npm run dev"

echo Waiting for the dev server to start...
timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:5173/

echo Dev server is running in a separate window.
pause

endlocal