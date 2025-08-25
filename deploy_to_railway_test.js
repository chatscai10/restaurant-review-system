/**
 * Railway部署測試和真實服务器验证
 */

const https = require('https');

class RailwayDeploymentTester {
    constructor() {
        this.railwayUrl = null;
        this.telegramBotToken = '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc';
        this.telegramChatId = '-1002658082392';
    }

    /**
     * 設定Railway部署URL
     */
    setRailwayUrl(url) {
        this.railwayUrl = url;
        console.log(`🎯 設定Railway測試URL: ${url}`);
    }

    /**
     * 測試Railway服務器健康狀態
     */
    async testServerHealth() {
        if (!this.railwayUrl) {
            throw new Error('請先設定Railway URL');
        }

        console.log('🔍 測試Railway服務器健康狀態...');
        
        try {
            const response = await this.makeHttpRequest(`${this.railwayUrl}/`);
            
            if (response.statusCode === 200) {
                console.log('✅ Railway服務器健康檢查通過');
                return true;
            } else {
                console.log(`⚠️ 服務器狀態異常: ${response.statusCode}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ 服務器連接失敗: ${error.message}`);
            return false;
        }
    }

    /**
     * 測試Railway上的真實數據抓取
     */
    async testRealDataCrawling() {
        console.log('🚀 測試Railway環境真實數據抓取...');

        const testData = {
            stores: [{
                name: '中壢龍崗',
                urls: {
                    google: 'https://maps.app.goo.gl/fS8RAzxJpBjVpSQT9',
                    uber: 'https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9',
                    panda: 'https://foodpanda.page.link/yhvLQKDDAScTN5rq7'
                }
            }]
        };

        try {
            const response = await this.makePostRequest(
                `${this.railwayUrl}/api/analyze`,
                testData
            );

            if (response.statusCode === 200) {
                const result = JSON.parse(response.data);
                return this.analyzeTestResults(result);
            } else {
                console.log(`❌ API請求失敗: ${response.statusCode}`);
                return null;
            }
        } catch (error) {
            console.error(`❌ 真實數據測試失敗: ${error.message}`);
            return null;
        }
    }

    /**
     * 分析測試結果
     */
    analyzeTestResults(result) {
        console.log('📊 分析Railway環境測試結果...');

        const store = result.stores[0];
        const testResult = {
            serverType: 'Railway Cloud Environment',
            timestamp: new Date().toLocaleString('zh-TW'),
            storeName: store.name,
            platforms: {},
            summary: {
                totalPlatforms: 0,
                successfulPlatforms: 0,
                averageRating: 0,
                dataQuality: 'unknown'
            }
        };

        let totalRating = 0;
        let validRatings = 0;

        // 分析各平台結果
        Object.entries(store.platforms || {}).forEach(([platform, data]) => {
            testResult.platforms[platform] = {
                success: data.success,
                rating: data.rating,
                reviewCount: data.reviewCount,
                source: data.source,
                isRealData: this.isRealData(data)
            };

            testResult.summary.totalPlatforms++;
            
            if (data.success && data.rating && !isNaN(data.rating)) {
                testResult.summary.successfulPlatforms++;
                totalRating += parseFloat(data.rating);
                validRatings++;
            }

            // 輸出平台結果
            const emoji = this.getPlatformEmoji(platform);
            const platformName = this.getPlatformName(platform);
            
            if (data.success) {
                const dataType = this.isRealData(data) ? '真實數據' : '模擬數據';
                console.log(`  ${emoji} ${platformName}: ${data.rating}⭐ (${data.reviewCount || 'N/A'} 評論) - ${dataType}`);
            } else {
                console.log(`  ${emoji} ${platformName}: ❌ 失敗`);
            }
        });

        // 計算平均評分和數據品質
        if (validRatings > 0) {
            testResult.summary.averageRating = totalRating / validRatings;
        }

        // 判斷數據品質
        const realDataCount = Object.values(testResult.platforms).filter(p => p.isRealData).length;
        if (realDataCount === testResult.summary.totalPlatforms) {
            testResult.summary.dataQuality = '100% 真實數據';
        } else if (realDataCount > 0) {
            testResult.summary.dataQuality = `部分真實數據 (${realDataCount}/${testResult.summary.totalPlatforms})`;
        } else {
            testResult.summary.dataQuality = '模擬數據';
        }

        console.log(`📈 平均評分: ${testResult.summary.averageRating.toFixed(1)}⭐`);
        console.log(`🎯 數據品質: ${testResult.summary.dataQuality}`);
        console.log(`✅ 成功率: ${testResult.summary.successfulPlatforms}/${testResult.summary.totalPlatforms}`);

        return testResult;
    }

    /**
     * 判斷是否為真實數據
     */
    isRealData(data) {
        // 檢查數據來源和特徵
        const isSimulated = data.source?.includes('simple') || 
                           data.source?.includes('simulation') ||
                           data.source?.includes('mock') ||
                           (data.reviewCount && data.reviewCount.includes('+'));
        
        return !isSimulated && data.success && data.rating;
    }

    /**
     * 發送Railway測試結果通知
     */
    async sendRailwayTestNotification(testResult) {
        const successEmoji = testResult.summary.successfulPlatforms === testResult.summary.totalPlatforms ? '🎉' : '⚠️';
        
        const message = `${successEmoji} Railway服務器測試報告

🌐 服務器環境: Railway Cloud  
📅 測試時間: ${testResult.timestamp}
🏷️ 測試店家: ${testResult.storeName}

📊 測試結果:
${Object.entries(testResult.platforms).map(([platform, data]) => {
    const emoji = this.getPlatformEmoji(platform);
    const platformName = this.getPlatformName(platform);
    const dataType = data.isRealData ? '✅真實' : '⚠️模擬';
    
    if (data.success) {
        return `${emoji} ${platformName}: ${data.rating}⭐ ${dataType}`;
    } else {
        return `${emoji} ${platformName}: ❌失敗`;
    }
}).join('\\n')}

📈 整體評估:
• 平均評分: ${testResult.summary.averageRating.toFixed(1)}⭐
• 成功率: ${testResult.summary.successfulPlatforms}/${testResult.summary.totalPlatforms}
• 數據品質: ${testResult.summary.dataQuality}

🚀 Railway部署狀態: ${testResult.summary.successfulPlatforms > 0 ? '✅成功' : '❌需優化'}

🔗 測試網址: ${this.railwayUrl}

🤖 Railway自動測試通知`;

        try {
            const response = await this.sendTelegramMessage(message);
            
            if (response.ok) {
                console.log('✅ Railway測試結果通知已發送');
                return true;
            } else {
                console.log('❌ 通知發送失敗:', response.description);
                return false;
            }
        } catch (error) {
            console.error('❌ 發送通知時出錯:', error.message);
            return false;
        }
    }

    /**
     * 執行完整Railway測試流程
     */
    async executeFullRailwayTest(railwayUrl) {
        this.setRailwayUrl(railwayUrl);
        
        console.log('🚀 開始Railway完整測試流程...\n');

        // 1. 健康檢查
        const healthOk = await this.testServerHealth();
        
        if (!healthOk) {
            console.log('❌ Railway服務器健康檢查失敗，中止測試');
            return false;
        }

        // 2. 真實數據抓取測試
        const testResult = await this.testRealDataCrawling();
        
        if (!testResult) {
            console.log('❌ Railway真實數據測試失敗');
            return false;
        }

        // 3. 發送測試結果通知
        await this.sendRailwayTestNotification(testResult);

        console.log('\n🎊 Railway測試流程完成！');
        return testResult.summary.successfulPlatforms > 0;
    }

    /**
     * HTTP請求輔助方法
     */
    async makeHttpRequest(url, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const request = https.get(url, (response) => {
                let data = '';
                response.on('data', (chunk) => data += chunk);
                response.on('end', () => resolve({ statusCode: response.statusCode, data }));
            });
            
            request.on('error', reject);
            request.setTimeout(timeout, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    async makePostRequest(url, postData, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const data = JSON.stringify(postData);
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const request = https.request(options, (response) => {
                let responseData = '';
                response.on('data', (chunk) => responseData += chunk);
                response.on('end', () => resolve({ 
                    statusCode: response.statusCode, 
                    data: responseData 
                }));
            });

            request.on('error', reject);
            request.setTimeout(timeout, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
            
            request.write(data);
            request.end();
        });
    }

    async sendTelegramMessage(message) {
        const payload = {
            chat_id: this.telegramChatId,
            text: message
        };

        return new Promise((resolve, reject) => {
            const data = JSON.stringify(payload);
            
            const options = {
                hostname: 'api.telegram.org',
                port: 443,
                path: `/bot${this.telegramBotToken}/sendMessage`,
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
                    try {
                        const result = JSON.parse(responseData);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    getPlatformEmoji(platform) {
        const emojis = { google: '🗺️', uber: '🚗', panda: '🐼' };
        return emojis[platform] || '🏪';
    }

    getPlatformName(platform) {
        const names = { google: 'Google Maps', uber: 'UberEats', panda: 'Foodpanda' };
        return names[platform] || platform;
    }
}

// 使用範例
if (require.main === module) {
    const tester = new RailwayDeploymentTester();
    
    // 從命令行參數獲取Railway URL，或使用預設URL
    const railwayUrl = process.argv[2] || 'https://restaurant-review-system-production.up.railway.app';
    
    console.log('🚀 啟動Railway部署測試...');
    
    tester.executeFullRailwayTest(railwayUrl)
        .then(success => {
            if (success) {
                console.log('\n🎉 Railway測試完成！系統在雲端環境運行正常');
                process.exit(0);
            } else {
                console.log('\n⚠️ Railway測試完成，但存在問題需要優化');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Railway測試執行失敗:', error.message);
            process.exit(1);
        });
}

module.exports = { RailwayDeploymentTester };