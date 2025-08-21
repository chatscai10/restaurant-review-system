@echo off
echo =====================================
echo    分店評價查詢系統 - 啟動腳本
echo =====================================
echo.

:: 檢查 Node.js 是否安裝
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 錯誤: 未找到 Node.js
    echo 請先安裝 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 已安裝
echo.

:: 檢查依賴是否安裝
if not exist node_modules (
    echo 📦 正在安裝依賴套件...
    npm install
    echo.
)

echo 🚀 啟動分店評價查詢系統...
echo.
echo 📡 服務器將在 http://localhost:3002 啟動
echo 🌐 請在瀏覽器中打開: http://localhost:3002
echo.
echo 按 Ctrl+C 停止服務器
echo.

:: 啟動服務器
npm start

pause