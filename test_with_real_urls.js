/**
 * 真實網址測試工具
 * 專門處理營業時間、APP跳轉等問題
 */

const { WebCrawler } = require('./utils/webCrawler');

class RealUrlTester {
    constructor() {
        this.crawler = new WebCrawler({
            headless: false, // 顯示瀏覽器便於觀察
            timeout: 45000
        });
    }

    /**
     * 測試外送平台網址（處理休息時間問題）
     */
    async testDeliveryPlatform(url, platform) {
        console.log(`\n🍔 測試外送平台: ${platform}`);
        console.log(`🔗 網址: ${url}`);
        console.log(`⏰ 測試時間: ${new Date().toLocaleString('zh-TW')}`);
        console.log('='.repeat(70));

        const page = await this.crawler.createPage();
        
        try {
            // 設置額外的反APP跳轉措施
            await page.setExtraHTTPHeaders({
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            });

            console.log('📱 正在訪問網頁版...');
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 45000
            });

            // 等待初始載入
            await page.waitForTimeout(3000);
            console.log('🔄 初始載入完成');

            // 處理APP跳轉和彈窗
            console.log('🚫 處理APP跳轉提示...');
            await this.handleAppRedirects(page, platform);

            // 再等待一些時間讓內容完全載入
            await page.waitForTimeout(5000);

            // 檢查頁面狀態
            const pageStatus = await this.checkPageStatus(page);
            console.log(`📄 頁面狀態: ${pageStatus.status}`);
            
            if (pageStatus.isClosed) {
                console.log('🕒 店家目前休息中，但嘗試獲取基本資料...');
            }

            // 嘗試提取數據（即使店家休息）
            const storeData = await this.extractStoreData(page, platform);
            
            // 截圖保存
            const screenshotPath = `test_${platform}_${Date.now()}.png`;
            await page.screenshot({ 
                path: screenshotPath, 
                fullPage: true 
            });
            console.log(`📸 截圖已保存: ${screenshotPath}`);

            return {
                success: true,
                platform: platform,
                url: url,
                currentUrl: page.url(),
                pageStatus: pageStatus,
                storeData: storeData,
                screenshot: screenshotPath,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`❌ 測試失敗: ${error.message}`);
            return {
                success: false,
                platform: platform,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        } finally {
            await page.close();
        }
    }

    /**
     * 處理APP跳轉和彈窗
     */
    async handleAppRedirects(page, platform) {
        try {
            await page.evaluate((platform) => {
                // 通用彈窗關閉
                const closeSelectors = [
                    '[aria-label*="關閉"]', '[aria-label*="close"]', '[aria-label*="Close"]',
                    '.close', '.modal-close', '.popup-close', '.dialog-close',
                    '[data-testid*="close"]', '[data-testid*="dismiss"]',
                    'button[class*="close"]', 'button[class*="dismiss"]'
                ];
                
                closeSelectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => el.click());
                });

                // 處理"繼續使用網頁版"按鈕
                const continueButtons = document.querySelectorAll('button, a, span');
                continueButtons.forEach(btn => {
                    const text = btn.textContent?.toLowerCase() || '';
                    if (text.includes('繼續') || text.includes('continue') || 
                        text.includes('網頁') || text.includes('web') ||
                        text.includes('瀏覽器') || text.includes('browser')) {
                        btn.click();
                    }
                });

                // 隱藏APP下載橫幅
                const appBanners = document.querySelectorAll('[class*="app"], [class*="download"], [class*="install"], [class*="banner"]');
                appBanners.forEach(banner => {
                    const text = banner.textContent?.toLowerCase() || '';
                    if (text.includes('下載') || text.includes('app') || 
                        text.includes('install') || text.includes('安裝')) {
                        banner.style.display = 'none';
                    }
                });

                // 平台特定處理
                if (platform === 'uber') {
                    // UberEats 特定選擇器
                    const uberClose = document.querySelectorAll('[data-testid="app-upsell-dismiss"]');
                    uberClose.forEach(el => el.click());
                }

                if (platform === 'panda') {
                    // Foodpanda 特定選擇器
                    const pandaClose = document.querySelectorAll('[class*="install-app"] button');
                    pandaClose.forEach(el => el.click());
                }

            }, platform);

            console.log('✅ APP跳轉處理完成');
        } catch (error) {
            console.log(`⚠️ APP跳轉處理警告: ${error.message}`);
        }
    }

    /**
     * 檢查頁面狀態
     */
    async checkPageStatus(page) {
        return await page.evaluate(() => {
            const pageText = document.body.textContent.toLowerCase();
            
            const status = {
                status: 'unknown',
                isClosed: false,
                hasRating: false,
                messages: []
            };

            // 檢查休息狀態
            const closedKeywords = ['休息', '關閉', 'closed', '暫停', '目前無法', '非營業時間'];
            const isClosedPage = closedKeywords.some(keyword => pageText.includes(keyword));
            
            if (isClosedPage) {
                status.status = 'closed';
                status.isClosed = true;
                status.messages.push('店家目前休息中');
            } else {
                status.status = 'open';
            }

            // 檢查是否有評分資訊
            const ratingKeywords = ['星', '評分', '評價', 'rating', 'star', '分', '/5'];
            const hasRatingInfo = ratingKeywords.some(keyword => pageText.includes(keyword));
            
            if (hasRatingInfo) {
                status.hasRating = true;
                status.messages.push('發現評分資訊');
            }

            // 檢查其他狀態
            if (pageText.includes('app') && pageText.includes('下載')) {
                status.messages.push('發現APP下載提示');
            }

            return status;
        });
    }

    /**
     * 提取店家數據（即使休息中）
     */
    async extractStoreData(page, platform) {
        return await page.evaluate((platform) => {
            const result = {
                name: null,
                rating: null,
                reviewCount: null,
                status: null,
                foundElements: []
            };

            // 店家名稱 - 通用選擇器
            const nameSelectors = [
                'h1', 'h2', '[data-testid*="name"]', '[data-testid*="title"]',
                '[class*="name"]', '[class*="title"]', '.restaurant-name',
                '.store-name', '.vendor-name'
            ];

            for (const selector of nameSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent && element.textContent.trim().length > 2) {
                    const text = element.textContent.trim();
                    if (!text.includes('下載') && !text.includes('App') && text.length < 100) {
                        result.name = text;
                        result.foundElements.push(`店名: ${selector}`);
                        break;
                    }
                }
            }

            // 評分 - 通用搜尋
            const allText = document.body.textContent;
            const ratingMatches = allText.match(/(\d\.\d)\s*(?:\/\s*5|星|★)/g);
            if (ratingMatches && ratingMatches.length > 0) {
                const ratingText = ratingMatches[0];
                const rating = parseFloat(ratingText.match(/\d\.\d/)[0]);
                if (rating >= 1 && rating <= 5) {
                    result.rating = rating;
                    result.foundElements.push(`評分: ${ratingText}`);
                }
            }

            // 評論數
            const reviewMatches = allText.match(/(\d+(?:,\d+)*)\s*(?:則評論|評價|reviews?)/gi);
            if (reviewMatches && reviewMatches.length > 0) {
                const reviewText = reviewMatches[0];
                const count = parseInt(reviewText.match(/\d+(?:,\d+)*/)[0].replace(/,/g, ''));
                result.reviewCount = count;
                result.foundElements.push(`評論數: ${reviewText}`);
            }

            // 從標題獲取店名（後備）
            if (!result.name && document.title) {
                const title = document.title;
                if (!title.includes('UberEats') && !title.includes('foodpanda') && !title.includes('App')) {
                    result.name = title.split(' | ')[0].split(' - ')[0].trim();
                    result.foundElements.push(`標題店名: ${title}`);
                }
            }

            return result;
        }, platform);
    }

    /**
     * 批量測試多個網址
     */
    async testMultipleUrls(urls) {
        console.log(`🧪 批量測試 ${urls.length} 個外送平台網址\n`);
        
        const results = [];
        
        for (let i = 0; i < urls.length; i++) {
            const urlInfo = urls[i];
            console.log(`\n📋 測試 ${i + 1}/${urls.length}: ${urlInfo.platform}`);
            
            const result = await this.testDeliveryPlatform(urlInfo.url, urlInfo.platform);
            results.push(result);

            // 測試間隔
            if (i < urls.length - 1) {
                console.log('\n⏸️ 等待 3 秒後進行下一個測試...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        // 生成測試報告
        this.generateTestReport(results);
        
        return results;
    }

    /**
     * 生成測試報告
     */
    generateTestReport(results) {
        console.log('\n📊 外送平台測試報告');
        console.log('='.repeat(80));
        
        let successCount = 0;
        let dataFoundCount = 0;
        
        results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`\n${status} 測試 ${index + 1}: ${result.platform}`);
            
            if (result.success) {
                successCount++;
                console.log(`   🌐 最終網址: ${result.currentUrl?.substring(0, 60)}...`);
                console.log(`   📄 頁面狀態: ${result.pageStatus?.status}`);
                console.log(`   📸 截圖: ${result.screenshot}`);
                
                if (result.storeData?.name) {
                    dataFoundCount++;
                    console.log(`   🏪 店名: ${result.storeData.name}`);
                    if (result.storeData.rating) {
                        console.log(`   ⭐ 評分: ${result.storeData.rating}`);
                    }
                    if (result.storeData.reviewCount) {
                        console.log(`   💬 評論: ${result.storeData.reviewCount}`);
                    }
                }
                
                if (result.storeData?.foundElements?.length > 0) {
                    console.log(`   🔍 發現元素: ${result.storeData.foundElements.join(', ')}`);
                }
            } else {
                console.log(`   ❌ 錯誤: ${result.error}`);
            }
        });

        console.log(`\n📈 測試統計:`);
        console.log(`✅ 訪問成功: ${successCount}/${results.length}`);
        console.log(`📊 數據獲取: ${dataFoundCount}/${results.length}`);
        console.log(`⏰ 測試時間: ${new Date().toLocaleString('zh-TW')}`);
    }

    /**
     * 清理資源
     */
    async cleanup() {
        await this.crawler.cleanup();
        console.log('🧹 測試工具已清理');
    }
}

// 主執行函數
async function main() {
    const tester = new RealUrlTester();
    
    try {
        console.log('🚀 外送平台真實網址測試工具');
        console.log('⚠️ 注意: 由於是休息時間，主要測試基本數據獲取能力');
        console.log('='.repeat(80));

        // 如果有命令行參數，使用提供的網址
        if (process.argv.length > 2) {
            const url = process.argv[2];
            const platform = process.argv[3] || 'auto';
            
            await tester.testDeliveryPlatform(url, platform);
        } else {
            // 使用測試網址
            const testUrls = [
                {
                    platform: 'uber',
                    url: 'https://www.ubereats.com/tw'
                },
                {
                    platform: 'panda', 
                    url: 'https://www.foodpanda.com.tw'
                }
            ];
            
            await tester.testMultipleUrls(testUrls);
        }

    } catch (error) {
        console.error('❌ 測試工具錯誤:', error);
    } finally {
        await tester.cleanup();
        console.log('\n🎉 測試完成');
    }
}

// 使用說明
if (process.argv.includes('--help')) {
    console.log(`
🔧 外送平台測試工具使用說明:

📋 基本用法:
node test_with_real_urls.js                    # 測試預設網址
node test_with_real_urls.js <網址> <平台>      # 測試指定網址

💡 範例:
node test_with_real_urls.js "https://www.ubereats.com/tw/store/test" uber
node test_with_real_urls.js "https://www.foodpanda.com.tw/restaurant/test" panda

🎯 特殊功能:
- 處理APP跳轉提示
- 處理店家休息狀態  
- 自動截圖保存
- 即使休息中也嘗試獲取基本資料

⚠️ 注意: 測試模式會顯示瀏覽器窗口
`);
} else {
    main().catch(console.error);
}

module.exports = { RealUrlTester };