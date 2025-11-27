@echo off

REM Set production mode
set NODE_ENV=production
set ELECTRON_IS_DEV=0

echo.
echo ========================================
echo   Job Hunting Manager
echo ========================================
echo.
echo Starting application...
echo.

call npm start
