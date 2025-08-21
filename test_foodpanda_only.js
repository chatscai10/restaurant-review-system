/**
 * 單獨測試 Foodpanda 短連結解析
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3003';

// HTTP 請求函數
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const data = options.data ? JSON.stringify(options.data) : null;
        
        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        if (data) {
            requestOptions.headers['Content-Length'] = Buffer.byteLength(data);
        }
        
        const req = http.request(requestOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const result = {
                        status: res.statusCode,
                        data: body ? JSON.parse(body) : {}
                    };
                    resolve(result);
                } catch (error) {
                    reject(new Error(`解析回應失敗: ${error.message}`));
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(data);
        }
        
        req.end();
    });
}

async function testFoodpandaOnly() {
    console.log('🐼 單獨測試 Foodpanda 短連結解析');
    console.log('=' * 50);
    
    const testData = {
        stores: [{
            id: 1,
            name: '不早脆皮雞排 中壢龍崗店',
            urls: {
                panda: 'https://foodpanda.page.link/yhvLQKDDAScTN5rq7'
            }
        }]
    };
    
    try {
        console.log('📋 測試數據:');
        console.log(`   🏪 分店: ${testData.stores[0].name}`);
        console.log(`   🔗 Foodpanda URL: ${testData.stores[0].urls.panda}`);
        console.log(`   📏 URL 長度: ${testData.stores[0].urls.panda.length}`);
        console.log('');
        
        console.log('⏳ 發送分析請求...');
        const startTime = Date.now();
        
        const response = await makeRequest(`${BASE_URL}/api/analyze-stores`, {
            method: 'POST',
            data: testData
        });
        
        const duration = Date.now() - startTime;
        console.log(`⏱️ 請求耗時: ${duration}ms`);
        
        if (response.status === 200) {
            const results = response.data;
            const store = results.stores[0];
            const panda = store.platforms.panda;
            
            console.log('\n📊 Foodpanda 分析結果:');
            console.log(`   狀態: ${panda.success ? '✅ 成功' : '❌ 失敗'}`);
            
            if (panda.success) {
                console.log(`   🏪 店名: ${panda.storeName || 'N/A'}`);
                console.log(`   ⭐ 評分: ${panda.rating || 'N/A'}/5.0`);
                console.log(`   💬 評論數: ${panda.reviewCount || 'N/A'}`);
                console.log(`   🚚 外送時間: ${panda.deliveryTime || 'N/A'}`);
                console.log(`   💰 最低訂單: ${panda.minimumOrder || 'N/A'}`);
            } else {
                console.log(`   ❌ 錯誤: ${panda.error}`);
                console.log(`   🔗 測試URL: ${panda.url}`);
            }
            
            console.log(`   ⏱️ 分析耗時: ${panda.analysisTime || 0}ms`);
            
        } else {
            console.error(`❌ API 錯誤: HTTP ${response.status}`);
            console.error('回應:', response.data);
        }
        
    } catch (error) {
        console.error('💥 測試失敗:', error.message);
    }
}

if (require.main === module) {
    testFoodpandaOnly().catch(console.error);
}