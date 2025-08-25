const https = require('https');

const forceRedeployMessage = `🔄 強制觸發Railway重新部署

❌ 問題確認:
• API端點修復代碼已推送
• 但Railway仍使用舊版server.js
• /api/analyze-stores 仍然404錯誤

🔧 強制重新部署:
✅ 添加版本標識到railway-server.js
✅ 推送新的commit觸發重新部署
✅ 確保Railway使用最新代碼

⏱️ 預計2-3分鐘內:
• Railway檢測到代碼變更
• 重新建置容器映像
• 使用railway-server.js啟動
• /api/analyze-stores 端點生效

🎯 重新部署完成後會看到:
• 啟動日誌: "版本: API端點修復版本"
• /api/analyze-stores 200回應
• 前端正常分析功能

🔄 正在強制重新部署中...

🤖 強制重新部署通知`;

const req = https.request({
    hostname: 'api.telegram.org',
    port: 443,
    path: '/bot7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc/sendMessage',
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify({
            chat_id: '-1002658082392',
            text: forceRedeployMessage
        }))
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('✅ 強制重新部署通知已發送'));
});

req.on('error', error => console.log('❌ 發送失敗:', error.message));

req.write(JSON.stringify({
    chat_id: '-1002658082392',
    text: forceRedeployMessage
}));
req.end();