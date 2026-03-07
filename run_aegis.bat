@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo    AEGIS Intelligence - Secure Launcher
echo ==========================================

:: 1. 바이너리 파일 존재 여부 확인 (Python 3.12 기준파일명)
set "BINARY_FOUND=0"
if exist core_security*.pyd set "BINARY_FOUND=1"

if "%BINARY_FOUND%"=="0" (
    echo [!] core_security binary not found.
    if exist core_security.py (
        echo [?] Source code found. Do you want to compile it now? (Y/N)
        set /p "CHOICE="
        if /i "!CHOICE!"=="Y" (
            call build_security_win.bat
        ) else (
            echo [!] Warning: Running without binary might fail if source is removed later.
        )
    ) else (
        echo [ERROR] Critical security module missing! 
        echo Please ensure core_security.pyd is present or run deploy.py to fetch it.
        pause
        exit /b 1
    )
)

:: 2. AEGIS 실행
echo [AEGIS] Starting engine...
python gods.py

if %errorlevel% neq 0 (
    echo [!] Server exited with error code %errorlevel%
    pause
)

echo ==========================================
echo    AEGIS Session Ended.
echo ==========================================
pause
