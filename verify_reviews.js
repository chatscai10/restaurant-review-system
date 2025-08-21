/**
 * 評論數量驗證工具
 * 開啟真實瀏覽器讓用戶手動確認正確的評論數量
 */

const { WebCrawler } = require('./utils/webCrawler');

class ReviewVerifier {
    constructor() {
        this.crawler = new WebCrawler({
            headless: false, // 顯示瀏覽器供人工檢查
            timeout: 60000
        });
    }

    async verifyBothPlatforms() {
        console.log('🔍 評論數量驗證工具');
        console.log('⚠️ 此工具會打開瀏覽器，請手動確認實際評論數量');
        console.log('='.repeat(70));

        const urls = [
            {
                name: 'UberEats - 不早脆皮雞排',
                url: 'https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9?diningMode=DELIVERY',
                platform: 'uber'
            },
            {
                name: 'Foodpanda - 不早脆皮雞排', 
                url: 'https://foodpanda.page.link/yhvLQKDDAScTN5rq7',
                platform: 'panda'
            }
        ];

        for (const urlInfo of urls) {
            await this.verifyUrl(urlInfo);
            
            // 等待用戶確認
            console.log('\n⏸️ 請手動檢查瀏覽器中的評論數量...');
            console.log('📝 記下正確的評論數量，然後按任意鍵繼續...');
            
            // 簡單的暫停機制
            await new Promise(resolve => {
                process.stdin.setRawMode(true);
                process.stdin.resume();
                process.stdin.once('data', () => {
                    process.stdin.setRawMode(false);
                    resolve();
                });
            });
        }
    }

    async verifyUrl(urlInfo) {
        console.log(`\n📋 檢查: ${urlInfo.name}`);
        console.log(`🔗 網址: ${urlInfo.url}`);
        console.log(`🌐 平台: ${urlInfo.platform}`);
        
        const page = await this.crawler.createPage();
        
        try {
            // 訪問頁面
            await page.goto(urlInfo.url, { 
                waitUntil: 'networkidle2',
                timeout: 60000 
            });

            // 等待載入
            await page.waitForTimeout(5000);

            // 處理APP跳轉
            await this.handlePrompts(page);
            await page.waitForTimeout(3000);

            // 嘗試自動解析
            const autoResult = await this.autoParseReviews(page);
            
            console.log(`🤖 自動解析結果:`);
            console.log(`   🏪 店名: ${autoResult.name || '未找到'}`);
            console.log(`   ⭐ 評分: ${autoResult.rating || '未找到'}`);
            console.log(`   💬 評論數: ${autoResult.reviewCount || '未找到'}`);
            
            if (autoResult.foundTexts.length > 0) {
                console.log(`   🔍 找到的文字: ${autoResult.foundTexts.slice(0, 3).join('; ')}`);
            }

            // 截圖
            const screenshot = `verify_${urlInfo.platform}_${Date.now()}.png`;
            await page.screenshot({ 
                path: screenshot,
                fullPage: true 
            });
            console.log(`📸 截圖保存: ${screenshot}`);

            console.log(`\n👁️ 請在瀏覽器中手動確認:`);
            console.log(`   1. 評分是否正確？`);
            console.log(`   2. 實際評論數量是多少？`);
            console.log(`   3. 評論數量在頁面哪個位置？`);

        } catch (error) {
            console.error(`❌ 檢查失敗: ${error.message}`);
        } finally {
            await page.close();
        }
    }

    async handlePrompts(page) {
        try {
            await page.evaluate(() => {
                // 關閉各種彈窗
                const closeButtons = document.querySelectorAll(
                    '[aria-label*="close"], [aria-label*="關閉"], .close, .modal-close, [data-testid*="close"]'
                );
                closeButtons.forEach(btn => btn.click());

                // 點擊繼續使用網頁版
                const continueButtons = document.querySelectorAll('button, a, span');
                continueButtons.forEach(btn => {
                    const text = btn.textContent?.toLowerCase() || '';
                    if (text.includes('continue') || text.includes('web') || text.includes('繼續')) {
                        btn.click();
                    }
                });
            });
        } catch (e) {
            console.log('⚠️ 彈窗處理:', e.message);
        }
    }

    async autoParseReviews(page) {
        return await page.evaluate(() => {
            const result = {
                name: null,
                rating: null,
                reviewCount: null,
                foundTexts: []
            };

            // 店名
            const nameSelectors = ['h1', '[role="heading"]', '.restaurant-name', '.store-name'];
            for (const selector of nameSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent && element.textContent.trim().length > 2) {
                    result.name = element.textContent.trim();
                    break;
                }
            }

            // 評分
            const pageText = document.body.textContent;
            const ratingMatch = pageText.match(/(\d\.\d)\s*(?:\/\s*5|stars?|星)/i);
            if (ratingMatch) {
                result.rating = parseFloat(ratingMatch[1]);
            }

            // 收集所有可能的評論相關文字
            const elements = document.querySelectorAll('*');
            for (const element of elements) {
                const text = element.textContent || '';
                if (text.length < 100 && (
                    /\d+.*review/i.test(text) || 
                    /\d+.*評論/i.test(text) ||
                    /\d+.*則/i.test(text) ||
                    /\(\d+\)/.test(text)
                )) {
                    result.foundTexts.push(text.trim());
                }
            }

            // 去重
            result.foundTexts = [...new Set(result.foundTexts)];

            // 嘗試從找到的文字中提取評論數
            for (const text of result.foundTexts) {
                const matches = [
                    text.match(/(\d+)\s*(?:reviews?|評論|則)/i),
                    text.match(/\((\d+)\)/),
                    text.match(/(\d+)\s*people/i)
                ];
                
                for (const match of matches) {
                    if (match) {
                        const count = parseInt(match[1]);
                        if (count > 0 && count < 100000) {
                            result.reviewCount = count;
                            break;
                        }
                    }
                }
                if (result.reviewCount) break;
            }

            return result;
        });
    }

    async cleanup() {
        await this.crawler.cleanup();
        console.log('🧹 驗證工具已清理');
    }
}

// 主執行函數
async function main() {
    const verifier = new ReviewVerifier();
    
    try {
        await verifier.verifyBothPlatforms();
        
        console.log('\n📊 驗證完成！');
        console.log('請提供實際看到的評論數量，我會據此修復解析邏輯。');
        
    } catch (error) {
        console.error('驗證失敗:', error);
    } finally {
        await verifier.cleanup();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { ReviewVerifier };