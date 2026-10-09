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
powershell -NoProfile -ExecutionPolicy Bypass -Command "$tcp = New-Object Net.Sockets.TcpClient; try { $tcp.Connect('127.0.0.1', 5000); exit 0 } catch { exit 1 } finally { $tcp.Close() }"
if not errorlevel 1 goto OPEN_APP

echo Dang khoi dong may chu tai http://localhost:5000 ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; try { $node = (Get-Command node -ErrorAction Stop).Source; $logDir = Join-Path $env:LOCALAPPDATA 'HoangNamPOS\Logs'; New-Item -ItemType Directory -Force -Path $logDir | Out-Null; Start-Process -FilePath $node -ArgumentList 'server.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'server.log') -RedirectStandardError (Join-Path $logDir 'server-error.log') } catch { Write-Error $_; exit 1 }"
if errorlevel 1 (
  echo Khong the chay may chu nen. Hay kiem tra Node.js va thu muc du an.
  pause
  exit /b 1
)

:: Wait briefly for the server, then open the app.
timeout /t 3 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "$tcp = New-Object Net.Sockets.TcpClient; try { $tcp.Connect('127.0.0.1', 5000); exit 0 } catch { exit 1 } finally { $tcp.Close() }"
if errorlevel 1 (
  echo May chu chua khoi dong duoc. Xem loi tai:
  echo %LOCALAPPDATA%\HoangNamPOS\Logs\server-error.log
  pause
  exit /b 1
)

:OPEN_APP
:: Start the Cloudflare Tunnel Windows service when it has been installed.
:: The tunnel token is configured once during cloudflared service installation;
:: do not store the secret token in this batch file.
echo Dang kiem tra ket noi Cloudflare Tunnel...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; $service = Get-Service -Name 'cloudflared' -ErrorAction SilentlyContinue; if (-not $service) { exit 2 }; if ($service.Status -ne 'Running') { Start-Service -Name 'cloudflared'; (Get-Service -Name 'cloudflared').WaitForStatus('Running', [TimeSpan]::FromSeconds(15)) }; exit 0"
if errorlevel 1 (
  echo Khong the bat Cloudflare Tunnel service.
  echo POS van chay tai http://localhost:5000, nhung pos.thiepcuoi.click co the chua truy cap duoc.
  echo Hay cai cloudflared va dang ky tunnel hoangnam-pos thanh Windows service tren may nay.
) else (
  echo Cloudflare Tunnel service dang chay.
)

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
