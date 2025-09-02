/**
 * Railway Telegram測試腳本
 * 專門用來驗證Railway環境下的Telegram通知功能
 */

const https = require('https');

async function testTelegramNotification() {
    console.log('🧪 Railway Telegram測試開始');
    console.log('⏰ 時間:', new Date().toLocaleString('zh-TW'));
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc';
    const adminGroup = process.env.TELEGRAM_ADMIN_GROUP || '-1002658082392';
    
    console.log('🔑 Bot Token:', botToken ? `${botToken.substring(0, 10)}...` : '未設定');
    console.log('👥 Admin Group:', adminGroup);
    
    const message = `🧪 Railway Telegram測試通知

⏰ 測試時間: ${new Date().toLocaleString('zh-TW')}
🌐 執行環境: ${process.env.RAILWAY_ENVIRONMENT ? 'Railway雲端' : '本機'}
📍 容器ID: ${process.env.RAILWAY_DEPLOYMENT_ID || '本機測試'}

✅ 如果您收到這則訊息，表示Railway Telegram通知功能正常！

🤖 Railway環境測試腳本`;

    return new Promise((resolve, reject) => {
        try {
            const payload = JSON.stringify({
                chat_id: adminGroup,
                text: message
            });
            
            console.log('📤 準備發送測試通知...');
            console.log('📄 訊息長度:', message.length, '字符');
            
            const options = {
                hostname: 'api.telegram.org',
                port: 443,
                path: `/bot${botToken}/sendMessage`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload, 'utf8')
                }
            };
            
            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    console.log('📡 HTTP狀態碼:', res.statusCode);
                    console.log('📄 回應內容:', responseData);
                    
                    if (res.statusCode === 200) {
                        console.log('✅ Telegram通知發送成功！');
                        resolve(responseData);
                    } else {
                        console.error('❌ Telegram通知失敗');
                        reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                console.error('❌ 請求錯誤:', error.message);
                reject(error);
            });
            
            req.setTimeout(10000, () => {
                console.error('⏰ 請求超時');
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            console.log('🚀 發送請求...');
            req.write(payload);
            req.end();
            
        } catch (error) {
            console.error('💥 異常錯誤:', error.message);
            reject(error);
        }
    });
}

// 執行測試
if (require.main === module) {
    testTelegramNotification()
        .then((response) => {
            console.log('\n🎉 測試完成 - 成功！');
            console.log('📊 回應數據:', JSON.stringify(JSON.parse(response), null, 2));
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 測試失敗:', error.message);
            process.exit(1);
        });
}

module.exports = { testTelegramNotification };