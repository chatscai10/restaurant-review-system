/**
 * 測試"+"格式評論數解析
 * 驗證修復是否正確處理 "600+" 和 "500+" 格式
 */

const { WebCrawler } = require('./utils/webCrawler');

class PlusFormatTester {
    constructor() {
        this.crawler = new WebCrawler({
            headless: false, // 顯示瀏覽器便於觀察
            timeout: 60000
        });
    }

    async testPlusFormat() {
        console.log('🧪 測試"+"格式評論數解析');
        console.log('='.repeat(60));

        const testUrls = [
            {
                name: 'UberEats - 不早脆皮雞排',
                url: 'https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9?diningMode=DELIVERY',
                platform: 'uber',
                expectedReviewFormat: '600+'
            },
            {
                name: 'Foodpanda - 不早脆皮雞排',
                url: 'https://foodpanda.page.link/yhvLQKDDAScTN5rq7',
                platform: 'panda',
                expectedReviewFormat: '500+'
            }
        ];

        const results = [];

        for (const testInfo of testUrls) {
            console.log(`\n🔍 測試: ${testInfo.name}`);
            console.log(`🌐 平台: ${testInfo.platform}`);
            console.log(`🎯 預期格式: ${testInfo.expectedReviewFormat}`);
            console.log(`🔗 網址: ${testInfo.url}`);
            console.log('-'.repeat(40));

            try {
                let result;
                if (testInfo.platform === 'uber') {
                    result = await this.crawler.scrapeUberEats(testInfo.url);
                } else if (testInfo.platform === 'panda') {
                    result = await this.crawler.scrapeFoodpanda(testInfo.url);
                }

                const testResult = {
                    platform: testInfo.platform,
                    name: testInfo.name,
                    expected: testInfo.expectedReviewFormat,
                    actual: result.reviewCount,
                    rating: result.rating,
                    storeName: result.name,
                    success: result.reviewCount ? true : false,
                    correctFormat: this.validatePlusFormat(result.reviewCount, testInfo.expectedReviewFormat)
                };

                results.push(testResult);

                console.log('📊 測試結果:');
                console.log(`  🏪 店名: ${result.name || '未找到'}`);
                console.log(`  ⭐ 評分: ${result.rating || '未找到'}`);
                console.log(`  💬 評論數: ${result.reviewCount || '未找到'}`);
                console.log(`  ✅ 格式正確: ${testResult.correctFormat ? '是' : '否'}`);

            } catch (error) {
                console.error(`❌ 測試失敗: ${error.message}`);
                results.push({
                    platform: testInfo.platform,
                    name: testInfo.name,
                    expected: testInfo.expectedReviewFormat,
                    actual: null,
                    success: false,
                    error: error.message,
                    correctFormat: false
                });
            }

            // 測試間隔
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        this.generateReport(results);
        return results;
    }

    /**
     * 驗證"+"格式是否正確
     */
    validatePlusFormat(actual, expected) {
        if (!actual) return false;
        
        // 如果預期是"600+"格式
        if (expected.includes('+')) {
            return String(actual).includes('+');
        }
        
        // 如果預期是純數字
        return !String(actual).includes('+');
    }

    /**
     * 生成測試報告
     */
    generateReport(results) {
        console.log('\n📋 "+"格式評論數測試報告');
        console.log('='.repeat(70));

        let totalTests = results.length;
        let successfulTests = results.filter(r => r.success).length;
        let correctFormatTests = results.filter(r => r.correctFormat).length;

        results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            const formatStatus = result.correctFormat ? '✅' : '❌';
            
            console.log(`\n${status} 測試 ${index + 1}: ${result.platform}`);
            console.log(`   🎯 預期格式: ${result.expected}`);
            console.log(`   📊 實際結果: ${result.actual || '無'}`);
            console.log(`   ${formatStatus} 格式正確: ${result.correctFormat}`);
            
            if (result.rating) {
                console.log(`   ⭐ 評分: ${result.rating}`);
            }
            if (result.storeName) {
                console.log(`   🏪 店名: ${result.storeName}`);
            }
            if (result.error) {
                console.log(`   ❌ 錯誤: ${result.error}`);
            }
        });

        console.log('\n📊 測試統計:');
        console.log(`✅ 成功測試: ${successfulTests}/${totalTests}`);
        console.log(`🎯 格式正確: ${correctFormatTests}/${totalTests}`);
        console.log(`📈 總成功率: ${(correctFormatTests/totalTests*100).toFixed(1)}%`);
        
        if (correctFormatTests === totalTests) {
            console.log('\n🎉 所有測試都通過！"+"格式支援修復成功！');
        } else {
            console.log('\n⚠️ 部分測試未通過，需要進一步調整');
        }
    }

    async cleanup() {
        await this.crawler.cleanup();
        console.log('🧹 測試工具已清理');
    }
}

// 主執行函數
async function main() {
    const tester = new PlusFormatTester();
    
    try {
        await tester.testPlusFormat();
    } catch (error) {
        console.error('測試工具錯誤:', error);
    } finally {
        await tester.cleanup();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { PlusFormatTester };