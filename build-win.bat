@echo off
cd /d "%~dp0"
chcp 65001 >nul
title Relay Build
echo ============================================================
echo               Relay Windows 安装包一键打包脚本
echo ============================================================
echo.
echo [1/3] 检查构建环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 环境！
    pause
    exit /b 1
)
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 npm 命令！
    pause
    exit /b 1
)
echo [OK] Node.js 与 npm 环境正常。
echo.
echo [2/3] 正在执行编译与打包 (npm run build:win)...
echo 采用 7-Zip LZMA2 极高压缩率打包，请耐心等待 1~2 分钟...
echo.
call npm run build:win
if %errorlevel% neq 0 (
    echo.
    echo [错误] 打包失败，请检查上方控制台的报错信息！
    pause
    exit /b 1
)
echo.
echo [3/3] 打包完成！
echo ============================================================
echo   构建成功！安装包保存在 dist 目录下：
dir /b /s "dist\Relay Setup *.exe" 2>nul
echo ============================================================
echo.
set OPEN_DIR=Y
set /p OPEN_DIR="是否立即打开 dist 目录？(Y/N, 默认 Y): "
if /i "%OPEN_DIR%"=="Y" (
    explorer "%~dp0dist"
)
echo.
echo 按任意键退出...
pause >nul
