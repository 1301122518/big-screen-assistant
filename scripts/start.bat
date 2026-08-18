@echo off
chcp 65001 >nul
title 大屏操作助手

echo ========================================
echo    大屏操作助手 - 启动中...
echo ========================================
echo.

:: 检查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python 3.10+
    pause
    exit /b 1
)

:: 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

:: 进入项目目录
cd /d "%~dp0.."

:: 安装后端依赖
echo [1/4] 安装后端依赖...
pip install -r requirements.txt -q
if errorlevel 1 (
    echo [错误] 后端依赖安装失败
    pause
    exit /b 1
)

:: 安装前端依赖
echo [2/4] 安装前端依赖...
cd frontend
call npm install --silent
if errorlevel 1 (
    echo [错误] 前端依赖安装失败
    pause
    exit /b 1
)

:: 构建前端
echo [3/4] 构建前端...
call npm run build
if errorlevel 1 (
    echo [错误] 前端构建失败
    pause
    exit /b 1
)
cd ..

:: 启动后端服务
echo [4/4] 启动服务...
echo.
echo ========================================
echo    大屏操作助手已启动！
echo.
echo    管理端: http://localhost:8080/admin
echo    播放端: http://localhost:8080/player
echo.
echo    按 Ctrl+C 停止服务
echo ========================================
echo.

python -m uvicorn backend.main:app --host 0.0.0.0 --port 8080

pause
