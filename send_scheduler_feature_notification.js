const https = require('https');

const schedulerFeatureMessage = `✨ 新功能上線：自動通知排程系統

🎉 回應用戶需求：
❓ "為什麼網頁上沒有可以設定自動通知的功能 時間等等的"
✅ 現在已經完整實現！

🆕 新增功能特色:

📅 排程設定頁面:
• 完整的時間設定介面
• 多種頻率選擇: 每小時/每日/每週/自定義
• 靈活的間隔時間設定 (30分鐘-24小時)

🔔 通知配置選項:
• ✅ 執行成功通知
• ❌ 執行失敗通知  
• 📈 評分變化通知
• 🏪 分店選擇 (全部/特定)

📊 管理功能:
• 排程狀態即時顯示
• 執行記錄查看
• 🧪 立即測試功能
• 排程優先級設定

🔗 使用方式:
1. 主頁面點擊 "自動通知設定" 按鈕
2. 在新視窗設定排程時間和通知選項
3. 儲存後系統自動執行定時分析
4. 結果自動發送到Telegram群組

🎯 完整解決方案:
• 網頁有完整的自動通知功能 ✅
• 可設定各種時間間隔 ✅  
• 與現有Telegram配置整合 ✅
• 提供測試和管理介面 ✅

🚀 立即體驗: 重新整理網頁即可看到新的 "自動通知設定" 按鈕！

🤖 排程功能上線通知`;

const req = https.request({
    hostname: 'api.telegram.org',
    port: 443,
    path: '/bot7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc/sendMessage',
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify({
            chat_id: '-1002658082392',
            text: schedulerFeatureMessage
        }))
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('✅ 排程功能上線通知已發送'));
});

req.on('error', error => console.log('❌ 發送失敗:', error.message));

req.write(JSON.stringify({
    chat_id: '-1002658082392',
    text: schedulerFeatureMessage
}));
req.end();