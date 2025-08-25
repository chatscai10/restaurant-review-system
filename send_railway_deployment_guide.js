/**
 * 發送Railway部署指南通知
 */

const https = require('https');

async function sendRailwayDeploymentGuide() {
    const botToken = '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc';
    const chatId = '-1002658082392';
    
    const message = `🚀 準備Railway部署 - 需要手動操作

📋 當前狀態:
✅ 代碼已推送到GitHub
✅ 系統驗證完成 (平均4.5⭐)
✅ 老闆檢查通知已發送
✅ Git備註狀態已保存

🎯 下一步 Railway 部署:

1️⃣ 前往 Railway 官網
🔗 https://railway.app

2️⃣ 點擊 "New Project"
• 選擇 "Deploy from GitHub repo"
• 選擇: chatscai10/restaurant-review-system

3️⃣ 設定環境變數:
NODE_ENV=production
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
TELEGRAM_BOT_TOKEN=7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc
TELEGRAM_CHAT_IDS=-1002658082392
PORT=3003

4️⃣ 等待部署完成 (約8-12分鐘)
• 會自動使用 Dockerfile
• 安裝 Chrome 瀏覽器
• 啟動應用程序

5️⃣ 獲得Railway網址後:
• 複製部署網址
• 回覆此群組提供網址
• 我將自動測試真實服務器環境

💰 費用: Railway付費方案 $5/月
🎯 預期結果: 100%真實數據抓取

⏳ 等待用戶在Railway完成部署...

🤖 部署指南自動通知`;

    const payload = {
        chat_id: chatId,
        text: message
    };

    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${botToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data, 'utf8')
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// 執行發送
console.log('📱 發送Railway部署指南...');

sendRailwayDeploymentGuide()
    .then(result => {
        if (result.ok) {
            console.log('✅ Railway部署指南已發送！');
            console.log(`📱 訊息ID: ${result.result.message_id}`);
            console.log('⏳ 等待用戶完成Railway部署並提供網址');
        } else {
            console.log('❌ 發送失敗:', result.description);
        }
    })
    .catch(error => {
        console.error('💥 執行錯誤:', error.message);
    });