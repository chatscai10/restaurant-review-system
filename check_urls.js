/**
 * 網址檢查工具
 * 幫助診斷各平台分享網址的格式和可訪問性
 */

const { WebCrawler } = require('./utils/webCrawler');

class UrlChecker {
    constructor() {
        this.crawler = new WebCrawler({
            headless: false, // 顯示瀏覽器進行檢查
            timeout: 30000
        });
    }

    /**
     * 檢查網址的基本信息
     */
    async checkUrl(url) {
        console.log(`\n🔍 檢查網址: ${url}`);
        console.log('='.repeat(80));

        try {
            // 1. 基本URL驗證
            const urlObj = new URL(url);
            console.log(`✅ URL格式正確`);
            console.log(`🌐 主域名: ${urlObj.hostname}`);
            console.log(`📂 路徑: ${urlObj.pathname}`);
            console.log(`🔗 完整長度: ${url.length} 字符`);

            // 2. 平台識別
            const platform = this.identifyPlatform(url);
            console.log(`🏷️ 識別平台: ${platform}`);

            // 3. 可訪問性檢查
            console.log(`\n📡 檢查網站可訪問性...`);
            const accessibility = await this.crawler.checkAccessibility(url);
            
            if (accessibility.accessible) {
                console.log(`✅ 網站可訪問 (HTTP ${accessibility.status})`);
                console.log(`🔄 最終網址: ${accessibility.url}`);
                
                // 檢查是否有重定向
                if (accessibility.url !== url) {
                    console.log(`🔄 發現重定向: ${url} → ${accessibility.url}`);
                }
            } else {
                console.log(`❌ 網站無法訪問`);
                console.log(`📝 錯誤: ${accessibility.error}`);
                return { accessible: false, error: accessibility.error };
            }

            // 4. 頁面內容檢查
            console.log(`\n📄 檢查頁面內容...`);
            const pageInfo = await this.checkPageContent(url);
            
            console.log(`📰 頁面標題: ${pageInfo.title || '未找到'}`);
            console.log(`🔍 包含關鍵字: ${pageInfo.keywords.join(', ') || '無'}`);
            console.log(`⭐ 可能的評分: ${pageInfo.possibleRating || '未找到'}`);

            return {
                accessible: true,
                platform: platform,
                finalUrl: accessibility.url,
                redirected: accessibility.url !== url,
                pageInfo: pageInfo
            };

        } catch (error) {
            console.log(`❌ URL檢查失敗: ${error.message}`);
            return { accessible: false, error: error.message };
        }
    }

    /**
     * 識別平台
     */
    identifyPlatform(url) {
        const lowerUrl = url.toLowerCase();
        
        if (lowerUrl.includes('google.com') || lowerUrl.includes('goo.gl')) {
            return 'Google Maps';
        } else if (lowerUrl.includes('ubereats.com')) {
            return 'UberEats';
        } else if (lowerUrl.includes('foodpanda.com')) {
            return 'Foodpanda';
        } else {
            return '未知平台';
        }
    }

    /**
     * 檢查頁面內容
     */
    async checkPageContent(url) {
        const page = await this.crawler.createPage();
        
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            await page.waitForTimeout(3000);

            const pageInfo = await page.evaluate(() => {
                const info = {
                    title: document.title,
                    keywords: [],
                    possibleRating: null
                };

                // 檢查關鍵字
                const text = document.body.textContent.toLowerCase();
                const keywords = ['評分', '星', '評論', 'rating', 'review', 'star'];
                info.keywords = keywords.filter(keyword => text.includes(keyword));

                // 尋找可能的評分
                const ratingTexts = document.body.textContent.match(/\d\.\d(?:\s*(?:\/\s*5|星|★))?/g);
                if (ratingTexts) {
                    info.possibleRating = ratingTexts[0];
                }

                return info;
            });

            return pageInfo;

        } catch (error) {
            return {
                title: null,
                keywords: [],
                possibleRating: null,
                error: error.message
            };
        } finally {
            await page.close();
        }
    }

    /**
     * 批量檢查多個網址
     */
    async checkMultipleUrls(urls) {
        console.log(`🧪 批量檢查 ${urls.length} 個網址\n`);
        
        const results = [];
        
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            console.log(`\n📋 檢查 ${i + 1}/${urls.length}: ${url.substring(0, 60)}...`);
            
            const result = await this.checkUrl(url);
            results.push({
                url: url,
                ...result
            });

            // 在檢查間稍作暫停
            if (i < urls.length - 1) {
                console.log('\n⏸️ 暫停 2 秒...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // 生成總結報告
        console.log('\n📊 檢查總結:');
        console.log('='.repeat(80));
        
        const accessible = results.filter(r => r.accessible).length;
        console.log(`✅ 可訪問: ${accessible}/${urls.length}`);
        console.log(`❌ 不可訪問: ${urls.length - accessible}/${urls.length}`);
        
        results.forEach((result, index) => {
            const status = result.accessible ? '✅' : '❌';
            const platform = result.platform || '未知';
            console.log(`${status} ${index + 1}. ${platform} - ${result.url.substring(0, 50)}...`);
            
            if (!result.accessible) {
                console.log(`   ❌ 錯誤: ${result.error}`);
            } else if (result.pageInfo?.possibleRating) {
                console.log(`   ⭐ 發現評分: ${result.pageInfo.possibleRating}`);
            }
        });

        return results;
    }

    /**
     * 清理資源
     */
    async cleanup() {
        await this.crawler.cleanup();
        console.log('\n🧹 網址檢查器已清理');
    }
}

// 使用說明
function showUsage() {
    console.log(`
🔧 網址檢查工具使用說明:

📋 基本用法:
node check_urls.js                    # 檢查預設測試網址
node check_urls.js <網址1> <網址2>    # 檢查指定網址

💡 範例:
node check_urls.js "https://maps.google.com/maps?q=麥當勞"
node check_urls.js "https://www.ubereats.com/tw/store/test" "https://www.foodpanda.com.tw"

🎯 功能:
- 檢查網址格式和可訪問性
- 識別平台類型
- 檢查頁面內容和評分信息
- 檢測重定向
- 生成詳細診斷報告

⚠️ 注意: 檢查模式會顯示瀏覽器窗口
`);
}

// 主執行函數
async function main() {
    const checker = new UrlChecker();
    
    try {
        let urlsToCheck = [];
        
        if (process.argv.length > 2) {
            // 使用命令行參數中的網址
            urlsToCheck = process.argv.slice(2);
        } else {
            // 使用預設測試網址
            urlsToCheck = [
                'https://maps.google.com/maps?q=麥當勞',
                'https://www.ubereats.com/tw',
                'https://www.foodpanda.com.tw'
            ];
        }
        
        console.log('🚀 網址檢查工具啟動');
        console.log(`⏰ 開始時間: ${new Date().toLocaleString('zh-TW')}`);
        
        if (urlsToCheck.length === 1) {
            await checker.checkUrl(urlsToCheck[0]);
        } else {
            await checker.checkMultipleUrls(urlsToCheck);
        }

    } catch (error) {
        console.error('❌ 檢查工具發生錯誤:', error);
    } finally {
        await checker.cleanup();
        console.log('\n🎉 檢查完成');
    }
}

// 導出和執行
module.exports = { UrlChecker };

if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        showUsage();
    } else {
        main().catch(console.error);
    }
}