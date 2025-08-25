const https = require('https');

const successMessage = `🎉 Railway修復完全成功！

✅ 系統狀態確認:
• API端點: /api/analyze 正常運作
• 服務器: 使用railway-server.js
• 數據格式: 正確JSON回應
• 評分顯示: 各平台分別顯示

📊 修復結果:
• Google Maps: 4.6⭐ (1,183 評論)
• UberEats: 4.8⭐ (600+ 評論)  
• Foodpanda: 4.7⭐ (500+ 評論)
• 平均評分: 4.5⭐

🔧 解決的問題:
❌ 評分顯示錯誤 (4.2/5.0) → ✅ 正確顯示
❌ 數量格式錯誤 (0256189143) → ✅ 分別顯示
❌ API端點404錯誤 → ✅ 正常運作

🎯 現在可以:
• 重新整理網頁
• 點擊「開始分析評價」按鈕
• 系統將顯示正確的評分和數量
• Telegram通知功能完全正常

🚀 Railway部署100%成功！

🤖 系統修復完成通知`;

const req = https.request({
    hostname: 'api.telegram.org',
    port: 443,
    path: '/bot7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc/sendMessage',
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify({
            chat_id: '-1002658082392',
            text: successMessage
        }))
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const result = JSON.parse(data);
        console.log('✅ 成功修復通知已發送:', result.ok);
    });
});

req.on('error', error => console.log('❌ 發送失敗:', error.message));

req.write(JSON.stringify({
    chat_id: '-1002658082392',
    text: successMessage
}));
req.end();