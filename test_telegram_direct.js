/**
 * 直接測試Telegram API發送
 */

const https = require('https');

async function testTelegramDirect() {
    const botToken = '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc';
    const chatId = '-1002658082392';
    
    const testMessage = `🧪 **Telegram測試訊息**

📅 時間: ${new Date().toLocaleString('zh-TW')}
✅ 這是一條測試訊息，確認您是否能正常收到Telegram通知

🔍 **Foodpanda店家確認**:
- 短連結: https://foodpanda.page.link/yhvLQKDDAScTN5rq7  
- 重定向到: bu-zao-cui-pi-ji-pai-zhong-li-long-gang-dian
- 店家名稱: **不早脆皮雞排 (中壢龍崗店)** ✅

🎯 **問題分析**:
1. Foodpanda短連結重定向正常
2. 店家確實是中壢龍崗店 (正確)
3. 需要檢查爬蟲為什麼提取錯誤名稱

📱 如果您收到這條訊息，請回覆確認Telegram功能正常`;

    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            chat_id: chatId,
            text: testMessage,
            parse_mode: 'Markdown'  // 使用Markdown格式
        });

        console.log('📤 準備發送的訊息長度:', data.length);
        console.log('🔍 訊息內容預覽:', testMessage.substring(0, 100) + '...');

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${botToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                console.log('📡 HTTP狀態碼:', res.statusCode);
                console.log('📋 API回應:', responseData);
                
                try {
                    const result = JSON.parse(responseData);
                    resolve(result);
                } catch (error) {
                    console.error('❌ 無法解析JSON回應:', error.message);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ 請求錯誤:', error.message);
            reject(error);
        });

        req.setTimeout(10000, () => {
            console.log('⏱️ 請求超時');
            req.destroy();
            reject(new Error('請求超時'));
        });
        
        req.write(data);
        req.end();
        
        console.log('📡 Telegram API請求已發送...');
    });
}

// 執行測試
console.log('🚀 開始Telegram直接測試...');

testTelegramDirect()
    .then(result => {
        if (result.ok) {
            console.log('✅ Telegram訊息發送成功！');
            console.log('📱 訊息ID:', result.result.message_id);
            console.log('📅 發送時間:', new Date(result.result.date * 1000).toLocaleString('zh-TW'));
        } else {
            console.log('❌ Telegram訊息發送失敗:', result.description);
            console.log('🔍 錯誤代碼:', result.error_code);
        }
    })
    .catch(error => {
        console.error('💥 測試執行失敗:', error.message);
    });