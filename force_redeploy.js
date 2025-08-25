const https = require('https');

// 發送重新部署指導和狀態通知
async function sendRedeploymentGuide() {
    const message = `🔧 Railway重新部署指導

📋 當前狀態:
✅ Railway伺服器運行正常
✅ URL: https://restaurant-review-system-production.up.railway.app
⚠️ 使用舊版server.js而非railway-server.js
⚠️ Telegram環境變數缺失

🎯 需要操作:

1️⃣ 設定環境變數 (在Railway網頁):
點擊 Variables 標籤 → 新增:
• TELEGRAM_BOT_TOKEN = 7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc  
• TELEGRAM_CHAT_IDS = -1002658082392

2️⃣ 強制重新部署:
• 點擊右上角 Deployments 標籤
• 點擊 "Deploy Latest Commit" 或 "Redeploy"

✅ 這將確保:
• 使用最新的railway-server.js
• 載入Telegram環境變數
• 啟用完整API功能

⏱️ 預計2-3分鐘完成重新部署
📱 完成後會自動發送測試通知

🤖 重新部署指導通知`;

    try {
        const payload = JSON.stringify({
            chat_id: '-1002658082392',
            text: message
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: '/bot7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc/sendMessage',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload, 'utf8')
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const result = JSON.parse(data);
                    resolve(result);
                });
            });
            
            req.on('error', reject);
            req.write(payload);
            req.end();
        });
        
    } catch (error) {
        console.error('❌ 發送指導通知失敗:', error.message);
    }
}

// 執行發送
console.log('📱 發送Railway重新部署指導...');

sendRedeploymentGuide()
    .then(result => {
        if (result.ok) {
            console.log('✅ 重新部署指導已發送');
            console.log('📋 請按照指導在Railway網頁完成設定');
            console.log('🔄 設定完成後Railway會自動重新部署');
        } else {
            console.log('❌ 發送失敗:', result.description);
        }
    })
    .catch(error => {
        console.error('💥 執行錯誤:', error.message);
    });