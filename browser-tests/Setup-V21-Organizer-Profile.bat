@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title IWP Organizer Test Profile Setup

cls
echo ============================================================
echo IWP COMMUNITY CONNECTIONS ORGANIZER PROFILE SETUP
echo ============================================================
echo.
echo Your normal Chrome windows can stay open.
echo This opens a separate Chrome profile used only for organizer tests.
echo.

set "WORK=%LOCALAPPDATA%\IWP-Community-Connections-Browser-Tests"
if not exist "%WORK%" mkdir "%WORK%"
copy /y "%~dp0setup-organizer-profile.js" "%WORK%\setup-organizer-profile.js" >nul
copy /y "%~dp0test-config.json" "%WORK%\test-config.json" >nul

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Install the current Node.js LTS version, then run this file again.
  echo.
  pause
  exit /b 1
)

cd /d "%WORK%"
node setup-organizer-profile.js
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" echo Organizer profile setup failed.
pause
exit /b %RESULT%
