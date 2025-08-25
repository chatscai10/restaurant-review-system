const https = require('https');

const explanationMessage = `🔢 平均評分4.5的原因說明

📊 當前顯示狀況:
• 各平台評分: Google 4.6⭐ + Uber 4.8⭐ + Panda 4.7⭐
• 顯示平均: 4.5⭐ ❌ (錯誤)
• 正確平均: (4.6 + 4.8 + 4.7) ÷ 3 = 4.7⭐ ✅

❌ 問題原因:
• Railway-server.js中硬編碼為4.5
• 沒有進行實際計算
• Railway尚未使用最新修復代碼

🔧 已修復內容:
✅ 修正計算邏輯為動態計算
✅ 添加計算過程顯示
✅ 確保數學準確性
✅ 代碼已推送到GitHub

⏱️ 下次重新整理網頁時:
• 平均評分會正確顯示為4.7⭐
• 各分店評分計算準確
• 包含計算過程說明

🎯 這是一個數學邏輯錯誤，不影響系統功能正常運作

🤖 評分計算修復說明`;

const req = https.request({
    hostname: 'api.telegram.org',
    port: 443,
    path: '/bot7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc/sendMessage',
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify({
            chat_id: '-1002658082392',
            text: explanationMessage
        }))
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('✅ 平均評分說明已發送'));
});

req.on('error', error => console.log('❌ 發送失敗:', error.message));

req.write(JSON.stringify({
    chat_id: '-1002658082392',
    text: explanationMessage
}));
req.end();