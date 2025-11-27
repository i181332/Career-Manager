@echo off

REM Shortcut creation check
set "SHORTCUT_FLAG=%~dp0.shortcut_created"
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT_NAME=Job Hunting Manager.lnk"
set "SHORTCUT_PATH=%DESKTOP%\%SHORTCUT_NAME%"
set "RUN_BAT=%~dp0run.bat"

if not exist "%SHORTCUT_FLAG%" (
    echo.
    echo ========================================
    echo   Job Hunting Manager - First Launch
    echo ========================================
    echo.
    echo Create desktop shortcut?
    echo.
    choice /C YN /M "Press Y to create, N to skip"

    if errorlevel 2 (
        echo.
        echo Shortcut was not created.
        echo.
    ) else (
        REM Create shortcut using PowerShell (pointing to run.bat)
        powershell -NoProfile -ExecutionPolicy Bypass -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%RUN_BAT%'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.Description = 'Launch Job Hunting Manager'; $Shortcut.Save()"

        if exist "%SHORTCUT_PATH%" (
            echo.
            echo Desktop shortcut created successfully!
            echo.
        ) else (
            echo.
            echo Failed to create shortcut.
            echo.
        )
    )

    REM Create flag file to skip this check next time
    echo 1 > "%SHORTCUT_FLAG%"
    timeout /t 2 /nobreak >nul
)

echo.
echo ========================================
echo   Job Hunting Manager
echo ========================================
echo.
echo Building application...
echo.

call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed.
    echo.
    pause
    exit /b 1
)

echo.
echo Build complete! Starting application...
echo.

call npm start
