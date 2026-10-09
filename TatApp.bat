@echo off
chcp 65001 >nul
title Tat ung dung POS Hoang Nam

echo ================================================
echo   DANG TAT UNG DUNG POS HOANG NAM
echo ================================================

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0TatApp.ps1"
if errorlevel 1 echo Co loi khi tat POS. Hay xem thong bao o tren.

pause
