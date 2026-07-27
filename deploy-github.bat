@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Building...
"D:\claude code\desitination\node.exe" _build_single.js
if errorlevel 1 exit /b 1
echo.
echo 若已用 GitHub CLI 登录，可在本目录执行部署命令，见 DEPLOY.md
pause
