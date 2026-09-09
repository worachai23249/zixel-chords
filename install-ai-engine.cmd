@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-ai-engine.ps1"
if errorlevel 1 (
  echo.
  echo Installation did not complete. Read the message above, then press any key.
  pause >nul
  exit /b 1
)
echo.
echo Ready. Press any key to close this window.
pause >nul
