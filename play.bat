@echo off
REM Double-click launcher for Overlord RPG on Windows.
REM Tries the Python launcher (py), then python, then python3.

cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
    py play.py
    goto end
)

where python >nul 2>nul
if %errorlevel%==0 (
    python play.py
    goto end
)

where python3 >nul 2>nul
if %errorlevel%==0 (
    python3 play.py
    goto end
)

echo.
echo Python was not found on your system.
echo Install it from https://www.python.org/downloads/
echo and be sure to check "Add Python to PATH" during installation.

:end
echo.
pause
