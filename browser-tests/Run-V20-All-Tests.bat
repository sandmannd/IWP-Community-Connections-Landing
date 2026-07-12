@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title IWP Community Connections V20.3 Tests

set "SOURCE=%~dp0"
set "WORK=%LOCALAPPDATA%\IWP-Community-Connections-Browser-Tests"
set "SOURCE_REPORTS=%~dp0reports"
set "SOURCE_SCREENSHOTS=%~dp0screenshots"
set "WORK_REPORTS=%WORK%\reports"
set "WORK_SCREENSHOTS=%WORK%\screenshots"
set "REPORT=%SOURCE_REPORTS%\latest-report.html"
set "LOG=%SOURCE_REPORTS%\latest-run.log"
set "WORK_LOG=%WORK_REPORTS%\latest-run.log"

if not exist "%SOURCE_REPORTS%" mkdir "%SOURCE_REPORTS%"
if not exist "%SOURCE_SCREENSHOTS%" mkdir "%SOURCE_SCREENSHOTS%"
if exist "%REPORT%" del /q "%REPORT%" >nul 2>nul
if exist "%LOG%" del /q "%LOG%" >nul 2>nul

cls
echo ============================================================
echo IWP COMMUNITY CONNECTIONS V20.3 AUTOMATED TESTS
echo ============================================================
echo.
echo The test engine will run from your local Windows drive.
echo This avoids Node.js problems caused by Google Drive folders.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Install the current Node.js LTS version, then run this file again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm was not found even though Node.js was detected.
  echo Reinstall the current Node.js LTS version and include npm.
  echo.
  pause
  exit /b 1
)

if not exist "%WORK%" mkdir "%WORK%"
if not exist "%WORK_REPORTS%" mkdir "%WORK_REPORTS%"
if not exist "%WORK_SCREENSHOTS%" mkdir "%WORK_SCREENSHOTS%"

copy /y "%SOURCE%package.json" "%WORK%\package.json" >nul
copy /y "%SOURCE%run-tests.js" "%WORK%\run-tests.js" >nul
copy /y "%SOURCE%test-config.json" "%WORK%\test-config.json" >nul

cd /d "%WORK%"

if exist "node_modules\playwright\package.json" (
  node -e "JSON.parse(require('fs').readFileSync('node_modules/playwright/package.json','utf8'))" >nul 2>nul
  if errorlevel 1 (
    echo Existing local test engine is damaged. Reinstalling it...
    rmdir /s /q "node_modules" >nul 2>nul
    if exist "package-lock.json" del /q "package-lock.json" >nul 2>nul
  )
)

if not exist "node_modules\playwright\package.json" (
  echo First run only: installing the browser testing engine locally...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo ERROR: The test engine could not be installed.
    echo Review the messages above, then run this file again.
    echo.
    pause
    exit /b 1
  )
)

if exist "%WORK_REPORTS%\latest-report.html" del /q "%WORK_REPORTS%\latest-report.html" >nul 2>nul
if exist "%WORK_LOG%" del /q "%WORK_LOG%" >nul 2>nul

echo.
echo Starting backend and browser regression tests...
echo A Chrome window may open and close automatically.
echo.

call npm test > "%WORK_LOG%" 2>&1
set "TEST_EXIT=%ERRORLEVEL%"

type "%WORK_LOG%"

copy /y "%WORK_LOG%" "%LOG%" >nul 2>nul
if exist "%WORK_REPORTS%\latest-report.html" copy /y "%WORK_REPORTS%\latest-report.html" "%REPORT%" >nul 2>nul
if exist "%WORK_SCREENSHOTS%\*" xcopy /y /i /q "%WORK_SCREENSHOTS%\*" "%SOURCE_SCREENSHOTS%\" >nul 2>nul

cd /d "%SOURCE%"
echo.
if "%TEST_EXIT%"=="0" (
  echo ALL REQUIRED TESTS PASSED.
) else (
  echo ONE OR MORE REQUIRED TESTS FAILED.
)
echo.

if exist "%REPORT%" (
  echo Opening report:
  echo %REPORT%
  start "" "%REPORT%"
) else (
  echo ERROR: The test runner did not create an HTML report.
  echo Diagnostic log:
  echo %LOG%
  echo.
  echo The log will open now so the actual problem can be seen.
  if exist "%LOG%" start "" notepad.exe "%LOG%"
)

echo.
pause
exit /b %TEST_EXIT%
