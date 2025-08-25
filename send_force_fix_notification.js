const https = require('https');

async function sendForceRedeployNotification() {
    const message = `🚨 強制修復Railway啟動問題

📋 發現問題:
❌ Railway使用舊版server.js而非railway-server.js
❌ 評分和數量顯示錯誤 (4.2/5.0, 0256189143)
❌ 系統使用測試數據而非真實抓取

🔧 已修復:
✅ 強制修改railway.toml啟動命令
✅ 強制修改railway.json啟動命令  
✅ 代碼已推送觸發重新部署

⏱️ Railway會在2-3分鐘內:
• 自動檢測代碼變更
• 使用railway-server.js重新啟動
• 啟用正確的/api/analyze端點
• 顯示真實評分和數量

🎯 修復後預期結果:
• 平均評分: 4.5-4.7⭐ (真實數據)
• 評論數量: 正確分別顯示各平台數量
• Telegram通知: 完整功能
• API端點: /api/analyze 正常運作

🔄 正在監控重新部署進度...

🤖 強制修復通知`;

    try {
        const payload = JSON.stringify({
            chat_id: '-1002658082392',
            text: message
        });

        const req = https.request({
            hostname: 'api.telegram.org',
            port: 443,
            path: '/bot7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc/sendMessage',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload, 'utf8')
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const result = JSON.parse(data);
                console.log('✅ 強制修復通知已發送:', result.ok);
            });
        });
        
        req.on('error', error => console.log('❌ 發送失敗:', error.message));
        req.write(payload);
        req.end();
        
    } catch (error) {
        console.error('💥 執行錯誤:', error.message);
    }
}

console.log('📱 發送強制修復通知...');
sendForceRedeployNotification();