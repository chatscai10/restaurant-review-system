/**
 * 調試頁面內容工具
 * 專門檢查頁面上實際的評論數文字格式
 */

const { WebCrawler } = require('./utils/webCrawler');

class PageContentDebugger {
    constructor() {
        this.crawler = new WebCrawler({
            headless: false,
            timeout: 60000
        });
    }

    async debugPageContent(url, platform) {
        console.log(`\n🔍 調試 ${platform} 頁面內容`);
        console.log(`🔗 網址: ${url}`);
        console.log('='.repeat(60));

        const page = await this.crawler.createPage();
        
        try {
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 60000 
            });

            await page.waitForTimeout(8000);

            // 處理APP跳轉
            await page.evaluate(() => {
                // 關閉各種彈窗
                const closeButtons = document.querySelectorAll(
                    '[aria-label*="close"], [aria-label*="關閉"], .close, .modal-close'
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

            await page.waitForTimeout(3000);

            // 提取所有包含數字的文字
            const allNumberTexts = await page.evaluate(() => {
                const texts = [];
                const elements = document.querySelectorAll('*');
                
                for (const element of elements) {
                    const text = element.textContent || '';
                    
                    // 找包含數字的短文字（可能是評論數）
                    if (text.length < 50 && /\d/.test(text)) {
                        // 過濾常見的無關文字
                        if (!text.includes('$') && 
                            !text.includes('分鐘') && 
                            !text.includes('公里') &&
                            !text.includes(':') &&
                            !text.includes('AM') &&
                            !text.includes('PM')) {
                            texts.push(text.trim());
                        }
                    }
                }
                
                // 去重並排序
                return [...new Set(texts)].sort();
            });

            console.log('\n📊 頁面中所有包含數字的文字:');
            allNumberTexts.forEach((text, index) => {
                console.log(`  ${index + 1}: "${text}"`);
            });

            // 專門尋找評論相關的文字
            const reviewRelatedTexts = await page.evaluate(() => {
                const texts = [];
                const elements = document.querySelectorAll('*');
                
                for (const element of elements) {
                    const text = element.textContent || '';
                    
                    if (text.length < 100 && (
                        text.includes('review') ||
                        text.includes('評論') ||
                        text.includes('則') ||
                        text.includes('個評') ||
                        /\(\d+\)/.test(text) ||
                        /\d+\+/.test(text)  // 專門尋找 "+" 格式
                    )) {
                        texts.push({
                            text: text.trim(),
                            element: element.tagName,
                            classes: element.className
                        });
                    }
                }
                
                return texts;
            });

            console.log('\n💬 評論相關的文字:');
            reviewRelatedTexts.forEach((item, index) => {
                console.log(`  ${index + 1}: "${item.text}"`);
                console.log(`      標籤: ${item.element}, 類名: ${item.classes}`);
            });

            // 尋找具體的評分元素
            const ratingElements = await page.evaluate(() => {
                const results = [];
                const elements = document.querySelectorAll('*');
                
                for (const element of elements) {
                    const text = element.textContent || '';
                    
                    if (/\d\.\d/.test(text) && text.length < 20) {
                        results.push({
                            text: text.trim(),
                            element: element.tagName,
                            classes: element.className,
                            ariaLabel: element.getAttribute('aria-label')
                        });
                    }
                }
                
                return results;
            });

            console.log('\n⭐ 可能的評分元素:');
            ratingElements.forEach((item, index) => {
                console.log(`  ${index + 1}: "${item.text}"`);
                console.log(`      標籤: ${item.element}, 類名: ${item.classes}`);
                if (item.ariaLabel) console.log(`      aria-label: ${item.ariaLabel}`);
            });

            // 截圖
            const screenshotPath = `debug_${platform}_content_${Date.now()}.png`;
            await page.screenshot({ 
                path: screenshotPath,
                fullPage: true 
            });
            console.log(`\n📸 截圖已保存: ${screenshotPath}`);

        } catch (error) {
            console.error(`❌ 調試失敗: ${error.message}`);
        } finally {
            await page.close();
        }
    }

    async cleanup() {
        await this.crawler.cleanup();
    }
}

// 主執行函數
async function main() {
    const contentDebugger = new PageContentDebugger();
    
    try {
        // 調試UberEats
        await contentDebugger.debugPageContent(
            'https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9?diningMode=DELIVERY',
            'uber'
        );

        // 短暫暫停
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 調試Foodpanda
        await contentDebugger.debugPageContent(
            'https://foodpanda.page.link/yhvLQKDDAScTN5rq7',
            'panda'
        );

    } catch (error) {
        console.error('調試工具錯誤:', error);
    } finally {
        await contentDebugger.cleanup();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { PageContentDebugger };