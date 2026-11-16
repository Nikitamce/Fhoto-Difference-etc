@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is required.
  echo Install the LTS version from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)
for /f "delims=" %%V in ('node -p "Number(process.versions.node.split('.')[0])"') do set NODE_MAJOR=%%V
if %NODE_MAJOR% LSS 18 (
  echo Your Node.js version is too old. Install Node.js 18 or newer.
  pause
  exit /b 1
)
set OPEN_BROWSER=1
echo Starting PhotoCheck Studio local server...
echo This window must remain open while you use the app.
echo Close this window or press Ctrl+C to stop the server.
node server.mjs
if errorlevel 1 pause
