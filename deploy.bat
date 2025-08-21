@echo off
echo 🚀 開始部署分店評價查詢系統到雲端
echo ==========================================

echo 📦 檢查依賴...
if not exist node_modules (
    echo 📥 安裝依賴中...
    call npm install
)

echo 📝 初始化Git倉庫...
if not exist .git (
    git init
    git add .
    git commit -m "🎉 初始化分店評價查詢系統"
) else (
    git add .
    git diff --staged --quiet || git commit -m "🔧 更新系統配置和功能"
)

echo 🌐 準備部署到Vercel...
echo.
echo 📋 部署步驟說明:
echo 1. 安裝 Vercel CLI: npm i -g vercel
echo 2. 登入 Vercel: vercel login
echo 3. 部署專案: vercel
echo 4. 設定環境變數在 Vercel Dashboard
echo.
echo 💡 重要提醒:
echo - 記得在 Vercel Dashboard 設定 TELEGRAM_BOT_TOKEN
echo - 設定 TELEGRAM_CHAT_IDS (格式: -1002658082392,-1234567890)
echo - 網址格式: https://your-project.vercel.app
echo.

if exist "C:\Program Files\nodejs\vercel.cmd" (
    echo ✅ 檢測到 Vercel CLI，開始部署...
    vercel
) else (
    echo ⚠️ 請先安裝 Vercel CLI:
    echo npm install -g vercel
    echo 然後執行: vercel login 和 vercel
)

echo.
echo 🎉 部署腳本執行完成！
pause