/**
 * 爬蟲調試工具
 * 用於測試和調試各平台的爬蟲功能
 */

const { WebCrawler } = require('./utils/webCrawler');

class CrawlerDebugger {
    constructor() {
        this.crawler = new WebCrawler({
            headless: false, // 顯示瀏覽器窗口進行調試
            timeout: 45000
        });
    }

    /**
     * 調試單個網址
     */
    async debugUrl(url, platform) {
        console.log(`\n🔍 開始調試: ${platform}`);
        console.log(`📋 網址: ${url}`);
        console.log(`⏰ 時間: ${new Date().toLocaleString('zh-TW')}`);
        console.log('='.repeat(60));

        try {
            let result;
            
            switch (platform) {
                case 'google':
                    result = await this.crawler.scrapeGoogleMaps(url);
                    break;
                case 'uber':
                    result = await this.crawler.scrapeUberEats(url);
                    break;
                case 'panda':
                    result = await this.crawler.scrapeFoodpanda(url);
                    break;
                default:
                    result = await this.crawler.scrapeGeneric(url);
            }

            console.log('\n📊 調試結果:');
            console.log('✅ 成功獲取數據');
            console.log(`🏪 店家名稱: ${result.name || '未獲取'}`);
            console.log(`⭐ 評分: ${result.rating || '未獲取'}`);
            console.log(`💬 評論數: ${result.reviewCount || '未獲取'}`);
            
            if (result.address) console.log(`📍 地址: ${result.address}`);
            if (result.deliveryTime) console.log(`🚚 外送時間: ${result.deliveryTime}`);

            return { success: true, data: result };

        } catch (error) {
            console.log('\n❌ 調試失敗:');
            console.log(`🔥 錯誤類型: ${error.name}`);
            console.log(`📝 錯誤訊息: ${error.message}`);
            console.log(`📋 錯誤堆疊: ${error.stack}`);

            return { success: false, error: error.message };
        } finally {
            console.log('\n' + '='.repeat(60));
        }
    }

    /**
     * 測試所有範例網址
     */
    async testAllPlatforms() {
        console.log('🧪 開始全平台爬蟲測試\n');

        const testUrls = [
            {
                name: 'Google Maps - 麥當勞',
                url: 'https://maps.google.com/maps?q=麥當勞',
                platform: 'google'
            },
            {
                name: 'UberEats - 測試頁面',
                url: 'https://www.ubereats.com/tw',
                platform: 'uber'
            },
            {
                name: 'Foodpanda - 測試頁面',
                url: 'https://www.foodpanda.com.tw',
                platform: 'panda'
            }
        ];

        const results = [];

        for (const test of testUrls) {
            const result = await this.debugUrl(test.url, test.platform);
            results.push({
                name: test.name,
                platform: test.platform,
                success: result.success,
                data: result.data || null,
                error: result.error || null
            });

            // 在測試間稍作暫停
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\n📋 測試總結:');
        console.log('='.repeat(60));
        
        let successCount = 0;
        results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.name}`);
            
            if (result.success) {
                successCount++;
                if (result.data.name) console.log(`   📝 店名: ${result.data.name}`);
                if (result.data.rating) console.log(`   ⭐ 評分: ${result.data.rating}`);
            } else {
                console.log(`   ❌ 錯誤: ${result.error}`);
            }
            console.log('');
        });

        console.log(`📊 成功率: ${successCount}/${results.length} (${(successCount/results.length*100).toFixed(1)}%)`);

        return results;
    }

    /**
     * 檢查網站可訪問性
     */
    async checkAccessibility(url) {
        console.log(`\n🔍 檢查網站可訪問性: ${url}`);
        
        try {
            const result = await this.crawler.checkAccessibility(url);
            
            if (result.accessible) {
                console.log(`✅ 網站可訪問 (狀態碼: ${result.status})`);
                console.log(`🔄 重定向到: ${result.url}`);
            } else {
                console.log(`❌ 網站無法訪問`);
                console.log(`📝 錯誤: ${result.error}`);
            }
            
            return result;
            
        } catch (error) {
            console.log(`❌ 檢查失敗: ${error.message}`);
            return { accessible: false, error: error.message };
        }
    }

    /**
     * 截圖調試
     */
    async takeDebugScreenshot(url, filename) {
        console.log(`\n📸 截圖調試: ${url}`);
        
        try {
            const screenshotPath = filename || `debug_screenshot_${Date.now()}.png`;
            await this.crawler.takeScreenshot(url, screenshotPath);
            console.log(`✅ 截圖已保存: ${screenshotPath}`);
            return screenshotPath;
            
        } catch (error) {
            console.log(`❌ 截圖失敗: ${error.message}`);
            return null;
        }
    }

    /**
     * 清理資源
     */
    async cleanup() {
        await this.crawler.cleanup();
        console.log('🧹 調試工具已清理');
    }
}

// 主要調試函數
async function runDebugger() {
    const crawler = new CrawlerDebugger();
    
    try {
        console.log('🚀 爬蟲調試工具啟動');
        console.log('⏰ 啟動時間:', new Date().toLocaleString('zh-TW'));
        console.log('='.repeat(60));

        // 提示用戶輸入要調試的網址
        if (process.argv.length > 2) {
            const url = process.argv[2];
            const platform = process.argv[3] || 'auto';
            
            console.log(`🎯 調試指定網址: ${url}`);
            await crawler.debugUrl(url, platform);
            
        } else {
            console.log('📋 執行全平台測試...');
            await crawler.testAllPlatforms();
        }

    } catch (error) {
        console.error('💥 調試工具發生錯誤:', error);
    } finally {
        await crawler.cleanup();
        console.log('\n🎉 調試完成');
    }
}

// 命令行使用說明
function showUsage() {
    console.log(`
🔧 爬蟲調試工具使用說明:

📋 基本用法:
node debug_crawler.js                          # 執行全平台測試
node debug_crawler.js <網址>                   # 調試指定網址
node debug_crawler.js <網址> <平台>             # 調試指定網址和平台

📝 平台參數:
- google: Google Maps
- uber: UberEats  
- panda: Foodpanda
- auto: 自動檢測 (預設)

💡 範例:
node debug_crawler.js "https://maps.google.com/maps?q=麥當勞" google
node debug_crawler.js "https://www.ubereats.com/tw/store/test" uber

⚠️ 注意: 調試模式會顯示瀏覽器窗口，請勿關閉
`);
}

// 導出模組
module.exports = { CrawlerDebugger };

// 如果直接執行此文件
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        showUsage();
    } else {
        runDebugger().catch(console.error);
    }
}