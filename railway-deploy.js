/**
 * Railway 部署檢查和狀態監控工具
 */

const https = require('https');

class RailwayDeployChecker {
    constructor() {
        this.deploymentUrl = null;
        this.healthCheckPath = '/';
        this.apiTestPath = '/api/health';
    }

    /**
     * 設定部署URL
     */
    setDeploymentUrl(url) {
        this.deploymentUrl = url;
        console.log(`🎯 設定部署URL: ${url}`);
    }

    /**
     * 檢查部署健康狀態
     */
    async checkHealth() {
        if (!this.deploymentUrl) {
            console.error('❌ 請先設定部署URL');
            return false;
        }

        try {
            console.log('🔍 檢查部署健康狀態...');
            const response = await this.makeRequest(this.deploymentUrl + this.healthCheckPath);
            
            if (response.statusCode === 200) {
                console.log('✅ 健康檢查通過 - 服務正常運行');
                return true;
            } else {
                console.log(`⚠️ 健康檢查失敗 - 狀態碼: ${response.statusCode}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ 健康檢查錯誤: ${error.message}`);
            return false;
        }
    }

    /**
     * 測試API端點
     */
    async testApiEndpoints() {
        if (!this.deploymentUrl) {
            console.error('❌ 請先設定部署URL');
            return false;
        }

        console.log('🧪 測試API端點...');
        
        // 測試健康檢查API
        try {
            const healthResponse = await this.makeRequest(this.deploymentUrl + this.apiTestPath);
            console.log(`✅ API健康檢查: ${healthResponse.statusCode === 200 ? '正常' : '異常'}`);
        } catch (error) {
            console.log(`⚠️ API健康檢查失敗: ${error.message}`);
        }

        // 測試分析API
        try {
            const testData = {
                stores: [{
                    name: '測試店家',
                    urls: {
                        google: 'https://maps.app.goo.gl/fS8RAzxJpBjVpSQT9'
                    }
                }]
            };

            const analyzeResponse = await this.makePostRequest(
                this.deploymentUrl + '/api/analyze',
                testData
            );

            if (analyzeResponse.statusCode === 200) {
                const data = JSON.parse(analyzeResponse.data);
                console.log('✅ 分析API測試通過');
                console.log(`📊 返回數據: ${data.stores ? data.stores.length : 0} 個店家結果`);
                return true;
            }
        } catch (error) {
            console.log(`⚠️ 分析API測試失敗: ${error.message}`);
        }

        return false;
    }

    /**
     * 驗證真實數據抓取
     */
    async validateRealData() {
        console.log('🔍 驗證真實數據抓取功能...');
        
        const testUrls = {
            google: 'https://maps.app.goo.gl/fS8RAzxJpBjVpSQT9',
            uber: 'https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9',
            panda: 'https://foodpanda.page.link/yhvLQKDDAScTN5rq7'
        };

        const testData = {
            stores: [{
                name: '中壢龍崗',
                urls: testUrls
            }]
        };

        try {
            const response = await this.makePostRequest(
                this.deploymentUrl + '/api/analyze',
                testData
            );

            if (response.statusCode === 200) {
                const result = JSON.parse(response.data);
                const store = result.stores[0];

                console.log('📋 數據驗證結果:');
                
                let hasRealData = false;
                let platformResults = [];

                Object.entries(store.platforms || {}).forEach(([platform, data]) => {
                    const rating = data.rating;
                    const isValidRating = rating && rating !== 'N/A' && !isNaN(rating) && rating > 0;
                    
                    console.log(`  ${this.getPlatformEmoji(platform)} ${platform}: ${isValidRating ? rating + '⭐' : 'N/A'} (${data.reviewCount || 'N/A'} 評論)`);
                    
                    platformResults.push({
                        platform,
                        success: isValidRating,
                        rating,
                        source: data.source
                    });

                    if (isValidRating) hasRealData = true;
                });

                // 計算平均評分
                const validRatings = platformResults
                    .filter(p => p.success)
                    .map(p => parseFloat(p.rating));
                
                const avgRating = validRatings.length > 0 
                    ? (validRatings.reduce((a, b) => a + b, 0) / validRatings.length).toFixed(1)
                    : 'N/A';

                console.log(`📊 平均評分: ${avgRating}⭐ (${validRatings.length}/3個平台)`);

                if (hasRealData && avgRating !== 'N/A') {
                    console.log('🎉 真實數據抓取驗證成功！');
                    return true;
                } else {
                    console.log('⚠️ 仍在使用模擬數據或數據無效');
                    return false;
                }
            }
        } catch (error) {
            console.error(`❌ 數據驗證失敗: ${error.message}`);
        }

        return false;
    }

    /**
     * 完整部署驗證流程
     */
    async fullValidation(deploymentUrl) {
        this.setDeploymentUrl(deploymentUrl);
        
        console.log('\n🚀 開始Railway部署完整驗證...\n');

        // 1. 健康檢查
        const healthOk = await this.checkHealth();
        
        // 2. API端點測試
        const apiOk = await this.testApiEndpoints();
        
        // 3. 真實數據驗證
        const dataOk = await this.validateRealData();

        console.log('\n📋 驗證結果總結:');
        console.log(`  健康檢查: ${healthOk ? '✅ 通過' : '❌ 失敗'}`);
        console.log(`  API功能: ${apiOk ? '✅ 正常' : '❌ 異常'}`);
        console.log(`  真實數據: ${dataOk ? '✅ 成功' : '⚠️ 需改善'}`);

        if (healthOk && apiOk) {
            console.log('\n🎉 部署驗證成功！系統已準備就緒');
            
            if (dataOk) {
                console.log('🌟 恭喜！真實數據抓取功能正常運作');
            } else {
                console.log('💡 建議：檢查Chrome環境或網路連接以改善數據品質');
            }
            
            return true;
        } else {
            console.log('\n❌ 部署存在問題，請檢查日誌並重新部署');
            return false;
        }
    }

    /**
     * HTTP請求輔助函數
     */
    makeRequest(url) {
        return new Promise((resolve, reject) => {
            const request = https.get(url, (response) => {
                let data = '';
                response.on('data', (chunk) => data += chunk);
                response.on('end', () => resolve({ statusCode: response.statusCode, data }));
            });
            request.on('error', reject);
            request.setTimeout(10000, () => {
                request.destroy();
                reject(new Error('請求超時'));
            });
        });
    }

    /**
     * HTTP POST請求
     */
    makePostRequest(url, postData) {
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
            request.setTimeout(30000, () => {
                request.destroy();
                reject(new Error('請求超時'));
            });
            
            request.write(data);
            request.end();
        });
    }

    /**
     * 獲取平台表情符號
     */
    getPlatformEmoji(platform) {
        const emojis = {
            google: '🗺️',
            uber: '🚗',
            panda: '🐼'
        };
        return emojis[platform] || '🏪';
    }
}

// 使用範例
if (require.main === module) {
    const checker = new RailwayDeployChecker();
    
    // 從命令行參數獲取URL，或使用預設測試URL
    const deploymentUrl = process.argv[2] || 'https://restaurant-review-system-production.up.railway.app';
    
    checker.fullValidation(deploymentUrl)
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('驗證過程出錯:', error);
            process.exit(1);
        });
}

module.exports = { RailwayDeployChecker };