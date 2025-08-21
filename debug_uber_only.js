/**
 * UberEats專用調試工具
 * 專門調試為什麼沒有抓到"600+"格式
 */

const { WebCrawler } = require('./utils/webCrawler');

class UberDebugger {
    constructor() {
        this.crawler = new WebCrawler({
            headless: false,
            timeout: 60000
        });
    }

    async debugUberEats() {
        console.log('🔍 UberEats 專用調試');
        console.log('='.repeat(50));

        const url = 'https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9?diningMode=DELIVERY';
        const page = await this.crawler.createPage();
        
        try {
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 60000 
            });

            await page.waitForTimeout(8000);

            // 專門調試評論數提取
            const debugInfo = await page.evaluate(() => {
                const info = {
                    foundElements: [],
                    allBrackets: [],
                    allNumbers: [],
                    reviewSelectors: []
                };

                // 檢查我們的選擇器
                const reviewSelectors = [
                    '[data-testid*="review"]',
                    '[aria-label*="review"]',
                    '.review-count',
                    'span[class*="review"]'
                ];
                
                for (const selector of reviewSelectors) {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        const text = element.textContent || element.getAttribute('aria-label') || '';
                        if (text.trim()) {
                            info.reviewSelectors.push({
                                selector: selector,
                                text: text.trim(),
                                className: element.className,
                                tagName: element.tagName
                            });
                        }
                    }
                }

                // 檢查所有包含"600"的元素
                const allElements = document.querySelectorAll('*');
                for (const element of allElements) {
                    const text = element.textContent || '';
                    if (text.includes('600')) {
                        info.foundElements.push({
                            text: text.trim(),
                            tagName: element.tagName,
                            className: element.className,
                            id: element.id,
                            parentTag: element.parentElement?.tagName || 'none'
                        });
                    }
                }

                // 檢查所有括號內容
                const pageText = document.body.textContent;
                const bracketMatches = pageText.match(/\([^)]*\)/g);
                if (bracketMatches) {
                    info.allBrackets = bracketMatches.slice(0, 20); // 前20個
                }

                // 檢查所有數字
                const numberMatches = pageText.match(/\d+/g);
                if (numberMatches) {
                    const uniqueNumbers = [...new Set(numberMatches)]
                        .map(n => parseInt(n))
                        .filter(n => n > 20 && n < 10000)
                        .sort((a, b) => b - a);
                    info.allNumbers = uniqueNumbers.slice(0, 20);
                }

                return info;
            });

            console.log('\n📊 調試信息:');
            console.log('✅ 包含"600"的元素:');
            debugInfo.foundElements.forEach((elem, index) => {
                console.log(`  ${index + 1}: [${elem.tagName}] "${elem.text}"`);
                console.log(`      類名: ${elem.className || '無'}`);
                console.log(`      ID: ${elem.id || '無'}`);
                console.log(`      父標籤: ${elem.parentTag}`);
                console.log('');
            });

            console.log('🔍 我們的評論選擇器匹配結果:');
            debugInfo.reviewSelectors.forEach((item, index) => {
                console.log(`  ${index + 1}: [${item.selector}] "${item.text}"`);
                console.log(`      標籤: ${item.tagName}, 類名: ${item.className || '無'}`);
                console.log('');
            });

            console.log('📋 所有括號內容:');
            debugInfo.allBrackets.forEach((bracket, index) => {
                console.log(`  ${index + 1}: ${bracket}`);
            });

            console.log('\n🔢 頁面中的大數字:');
            console.log(`  ${debugInfo.allNumbers.slice(0, 10).join(', ')}`);

            // 嘗試手動執行我們的解析邏輯
            const manualResult = await page.evaluate(() => {
                const result = { reviewCount: null, matchedBy: null };

                // 複製我們實際的解析邏輯
                const reviewSelectors = [
                    '[data-testid*="review"]',
                    '[aria-label*="review"]',
                    '.review-count',
                    'span[class*="review"]'
                ];
                
                for (const selector of reviewSelectors) {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        const text = element.textContent || element.getAttribute('aria-label') || '';
                        console.log(`檢查元素: [${selector}] "${text}"`);
                        
                        // 策略2: 純括號格式 "(600+)" 
                        const match2 = text.match(/^\s*\((\d+(?:,\d+)*)(\+)?\)\s*$/);
                        if (match2) {
                            const baseCount = parseInt(match2[1].replace(/,/g, ''));
                            const hasPlus = match2[2]; // "+" 符號
                            result.reviewCount = hasPlus ? `${baseCount}+` : baseCount;
                            result.matchedBy = `選擇器策略2: ${selector}`;
                            console.log('✅ 策略2匹配!', result);
                            return result;
                        }
                    }
                }

                // 全頁面搜尋策略2: 純括號格式 "(600+)" 搜尋
                const pageText = document.body.textContent;
                const bracketMatches = pageText.match(/\((\d+(?:,\d+)*)(\+)?\)/g);
                if (bracketMatches) {
                    console.log('全頁面括號匹配:', bracketMatches.slice(0, 10));
                    
                    let bestMatch = null;
                    let bestCount = 0;
                    
                    for (const match of bracketMatches) {
                        const numberMatch = match.match(/\((\d+(?:,\d+)*)(\+)?\)/);
                        if (numberMatch) {
                            const baseCount = parseInt(numberMatch[1].replace(/,/g, ''));
                            console.log(`檢查括號: ${match}, 數字: ${baseCount}`);
                            if (baseCount > bestCount && baseCount >= 50) { // 合理的評論數範圍
                                bestCount = baseCount;
                                const hasPlus = numberMatch[2];
                                bestMatch = hasPlus ? `${baseCount}+` : baseCount;
                                console.log(`新最佳匹配: ${bestMatch}`);
                            }
                        }
                    }
                    
                    if (bestMatch) {
                        result.reviewCount = bestMatch;
                        result.matchedBy = '全頁面搜尋策略2';
                        console.log('✅ 全頁面策略2匹配!', result);
                    }
                }

                return result;
            });

            console.log('\n🎯 手動執行結果:');
            console.log(`評論數: ${manualResult.reviewCount || '未找到'}`);
            console.log(`匹配方式: ${manualResult.matchedBy || '無匹配'}`);

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
    const uberDebugger = new UberDebugger();
    
    try {
        await uberDebugger.debugUberEats();
    } catch (error) {
        console.error('調試工具錯誤:', error);
    } finally {
        await uberDebugger.cleanup();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { UberDebugger };