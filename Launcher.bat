@echo off
echo ===================================================
echo     Trim Sheet Architect - Local Launcher
echo ===================================================
echo.
echo Installing dependencies (if needed)...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo Error: Failed to install dependencies. Please ensure Node.js is installed.
    pause
    exit /b
)

echo.
echo Starting application...
echo The application will open in your default browser.
echo.
echo Press Ctrl+C in this window to stop the application.
echo.

:: Start Vite with the --open flag to automatically open the browser
call npm run dev -- --open

pause
