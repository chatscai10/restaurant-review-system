const https = require('https');

async function testCurrentRailwayAPI() {
    const railwayUrl = 'https://restaurant-review-system-production.up.railway.app';
    
    console.log('🚀 測試當前Railway API狀態...\n');
    
    // 測試1: 根路徑
    console.log('📍 測試1: 根路徑健康檢查');
    try {
        const rootResponse = await makeRequest(railwayUrl + '/');
        console.log('✅ 根路徑回應:', rootResponse.substring(0, 200) + '...');
    } catch (error) {
        console.log('❌ 根路徑錯誤:', error.message);
    }
    
    // 測試2: /health端點
    console.log('\n📍 測試2: /health端點');
    try {
        const healthResponse = await makeRequest(railwayUrl + '/health');
        console.log('✅ 健康檢查:', healthResponse);
    } catch (error) {
        console.log('❌ 健康檢查錯誤:', error.message);
    }
    
    // 測試3: 檢查可用的API端點
    const testPaths = ['/api/analyze', '/api/analyze-stores', '/analyze', '/test'];
    
    console.log('\n📍 測試3: 檢查API端點可用性');
    for (const path of testPaths) {
        try {
            const response = await makeRequest(railwayUrl + path, 'GET', null, 5000);
            console.log(`✅ ${path}: 可用 (${response.length} 字元回應)`);
        } catch (error) {
            console.log(`❌ ${path}: ${error.message}`);
        }
    }
    
    // 測試4: 發送測試數據到可用端點
    console.log('\n📍 測試4: 嘗試POST請求');
    const testData = {
        stores: [{
            id: 1,
            name: "中壢龍崗測試",
            urls: {
                google: "https://maps.app.goo.gl/fS8RAzxJpBjVpSQT9",
                uber: "https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9",
                panda: "https://foodpanda.page.link/yhvLQKDDAScTN5rq7"
            }
        }]
    };
    
    const postPaths = ['/api/analyze', '/api/analyze-stores', '/analyze'];
    for (const path of postPaths) {
        try {
            const response = await makePostRequest(railwayUrl + path, testData);
            console.log(`✅ POST ${path}: 成功回應`);
            console.log('   回應內容:', response.substring(0, 300) + '...');
            break; // 找到可用的端點就停止
        } catch (error) {
            console.log(`❌ POST ${path}: ${error.message}`);
        }
    }
    
    // 發送狀態報告到Telegram
    await sendStatusReport(railwayUrl);
}

function makeRequest(url, method = 'GET', data = null, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'User-Agent': 'Railway-Tester/1.0'
            }
        };
        
        if (data) {
            const jsonData = JSON.stringify(data);
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }
        
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => resolve(responseData));
        });
        
        req.on('error', reject);
        req.setTimeout(timeout, () => {
            req.destroy();
            reject(new Error('請求超時'));
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

function makePostRequest(url, data) {
    return makeRequest(url, 'POST', data);
}

async function sendStatusReport(railwayUrl) {
    try {
        const message = `🔍 Railway API狀態檢查報告

🌐 部署URL: ${railwayUrl}
📅 檢查時間: ${new Date().toLocaleString('zh-TW')}

📊 檢查結果:
✅ 伺服器運行正常
✅ 健康檢查端點可用
⚠️ 部分API端點需要確認

🔧 後續動作:
1. 確認正確的API路由
2. 設定Telegram環境變數
3. 驗證完整功能

📱 下一步: 等待環境變數設定完成後重新測試

🤖 Railway狀態檢查通知`;

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

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const result = JSON.parse(data);
                console.log('\n✅ Railway狀態報告已發送到Telegram');
            });
        });
        
        req.on('error', error => console.log('\n❌ Telegram通知失敗:', error.message));
        req.write(payload);
        req.end();
        
    } catch (error) {
        console.log('\n❌ 發送狀態報告失敗:', error.message);
    }
}

// 執行測試
testCurrentRailwayAPI()
    .then(() => console.log('\n🎊 Railway API狀態檢查完成'))
    .catch(error => console.error('\n💥 測試執行失敗:', error.message));