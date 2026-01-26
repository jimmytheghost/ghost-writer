@echo off
setlocal

cd /d "%~dp0src\wraider-editor" || (
  echo Failed to change directory to src\wraider-editor
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