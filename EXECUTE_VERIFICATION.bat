@echo off
echo 🚀 Railway部署驗證工具
echo.
echo 請輸入您的Railway部署網址：
set /p DEPLOYMENT_URL="URL (例如: https://your-app.up.railway.app): "

echo.
echo 🔍 開始驗證部署...
node railway-deploy.js "%DEPLOYMENT_URL%"

echo.
echo 驗證完成！請檢查上方結果。
pause