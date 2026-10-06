@echo off
chcp 65001 >nul
title Siêu thị Sữa Bỉm Hoàng Nam - POS Desktop App
cd /d "%~dp0"

echo ================================================
echo   PHAN MEM POS HOANG NAM
echo ================================================

where node >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay Node.js. Vui long cai Node.js roi chay lai.
  pause
  exit /b 1
)

:: Reuse the server if one is already running on port 5000.
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:5000/' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if not errorlevel 1 goto OPEN_APP

echo Dang khoi dong may chu tai http://localhost:5000 ...
start "Hoang Nam POS Server" /D "%~dp0" cmd /k node server.js

:: Wait briefly for the server, then open the app.
timeout /t 3 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:5000/' -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if errorlevel 1 (
  echo May chu chua khoi dong duoc. Hay xem cua so Hoang Nam POS Server de biet loi.
  pause
  exit /b 1
)

:OPEN_APP
echo Dang mo giao dien ban hang...
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5000 --start-maximized
  goto DONE
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5000 --start-maximized
  goto DONE
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5000 --start-maximized
  goto DONE
)
start "" http://localhost:5000

:DONE
echo Ung dung dang chay tai http://localhost:5000
pause
