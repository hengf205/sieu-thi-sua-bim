@echo off
chcp 65001 >nul
title Tắt máy chủ POS Hoàng Nam

echo ================================================
echo   ĐANG TẮT MÁY CHỦ POS HOÀNG NAM
echo ================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command "$owners = @(Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); if ($owners.Count -eq 0) { Write-Output 'Không tìm thấy máy chủ đang chạy trên cổng 5000.'; exit 0 }; $stopped = $false; foreach ($owner in $owners) { $proc = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $owner) -ErrorAction SilentlyContinue; if ($proc -and $proc.Name -eq 'node.exe' -and $proc.CommandLine -match 'server\.js') { Stop-Process -Id $owner -Force -ErrorAction Stop; Write-Output ('Đã tắt máy chủ POS (PID ' + $owner + ').'); $stopped = $true } else { Write-Output ('Không dừng PID ' + $owner + ' vì không xác nhận được đây là máy chủ POS.') } }; if (-not $stopped) { exit 1 }"
if errorlevel 1 (
  echo Không thể tự xác nhận hoặc tắt máy chủ POS. Hãy kiểm tra quyền Windows và tiến trình đang dùng cổng 5000.
) else (
  echo Bạn có thể đóng cửa sổ này.
)

pause
