@echo off
chcp 65001 >nul
title Siêu thị Sữa Bỉm Hoàng Nam - POS Desktop App
cd /d "%~dp0"

echo Đang khởi chạy Phần mềm POS Hoàng Nam (http://localhost:5000)...

:: Start local Node.js App Server
node server.js

exit
