@echo off
setlocal
cd /d "%~dp0"
title IWP Community Connections V25 Browser Regression

if not exist "browser-tests\Run-V25-All-Tests.bat" (
  echo ERROR: The browser test runner is missing.
  echo Re-extract the complete V25 source bundle and try again.
  pause
  exit /b 1
)

call "browser-tests\Run-V25-All-Tests.bat"
exit /b %ERRORLEVEL%
