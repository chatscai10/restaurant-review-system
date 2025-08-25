/**
 * 最簡單的Telegram測試
 */

const https = require('https');

async function sendMinimalMessage() {
    const botToken = '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc';
    const chatId = '-1002658082392';
    const simpleMessage = 'Hello from Claude Code!';

    const payload = {
        chat_id: chatId,
        text: simpleMessage
    };

    const data = JSON.stringify(payload);
    
    console.log('🔍 發送內容:');
    console.log('  Bot Token:', botToken.substring(0, 10) + '...');
    console.log('  Chat ID:', chatId);
    console.log('  Message:', simpleMessage);
    console.log('  JSON長度:', data.length);
    console.log('  JSON內容:', data);

    return new Promise((resolve, reject) => {
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
                console.log('\n📡 回應資訊:');
                console.log('  狀態碼:', res.statusCode);
                console.log('  Headers:', JSON.stringify(res.headers, null, 2));
                console.log('  內容:', responseData);
                
                try {
                    const result = JSON.parse(responseData);
                    resolve(result);
                } catch (error) {
                    reject(new Error(`JSON解析失敗: ${error.message}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// 執行最簡單測試
sendMinimalMessage()
    .then(result => {
        console.log('\n✅ 測試結果:', JSON.stringify(result, null, 2));
    })
    .catch(error => {
        console.error('\n❌ 測試失敗:', error.message);
    });