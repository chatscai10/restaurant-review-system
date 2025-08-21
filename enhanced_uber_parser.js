/**
 * 增強版UberEats解析器
 * 專門處理休息時間的評分獲取
 */

const { WebCrawler } = require('./utils/webCrawler');

class EnhancedUberParser {
    constructor() {
        this.crawler = new WebCrawler({
            headless: false,
            timeout: 60000
        });
    }

    async parseUberEatsStore(url) {
        console.log('🚀 啟動增強版UberEats解析器');
        console.log(`🔗 分析網址: ${url}`);
        
        const page = await this.crawler.createPage();
        
        try {
            // 訪問頁面
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 60000 
            });

            // 等待載入
            await page.waitForTimeout(5000);

            // 處理APP跳轉
            await this.handleAppPrompts(page);

            // 等待更長時間讓動態內容載入
            await page.waitForTimeout(8000);

            // 嘗試滾動頁面觸發懶載入
            await page.evaluate(() => {
                window.scrollTo(0, 500);
                setTimeout(() => window.scrollTo(0, 0), 1000);
            });
            
            await page.waitForTimeout(3000);

            // 深度解析頁面
            const storeData = await this.deepParsePage(page);

            // 如果還是沒找到評分，嘗試搜尋整個頁面的JSON數據
            if (!storeData.rating) {
                const jsonData = await this.extractJSONData(page);
                if (jsonData.rating) {
                    storeData.rating = jsonData.rating;
                    storeData.reviewCount = jsonData.reviewCount;
                }
            }

            // 截圖保存
            const timestamp = Date.now();
            await page.screenshot({ 
                path: `enhanced_uber_${timestamp}.png`,
                fullPage: true 
            });

            console.log('📊 解析結果:');
            console.log(`🏪 店名: ${storeData.name || '未找到'}`);
            console.log(`⭐ 評分: ${storeData.rating || '未找到'}`);
            console.log(`💬 評論數: ${storeData.reviewCount || '未找到'}`);
            console.log(`🕒 營業狀態: ${storeData.businessStatus || '未知'}`);
            console.log(`📸 截圖: enhanced_uber_${timestamp}.png`);

            return storeData;

        } catch (error) {
            console.error(`❌ 解析失敗: ${error.message}`);
            return { error: error.message };
        } finally {
            await page.close();
        }
    }

    async handleAppPrompts(page) {
        try {
            await page.evaluate(() => {
                // 更積極的APP提示處理
                const selectors = [
                    'button[aria-label*="close"]',
                    'button[aria-label*="Close"]', 
                    'button[aria-label*="關閉"]',
                    '[data-testid*="close"]',
                    '[data-testid*="dismiss"]',
                    '.close-button',
                    '.modal-close',
                    'button[class*="close"]'
                ];

                selectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        try { el.click(); } catch (e) {}
                    });
                });

                // 點擊"繼續使用網頁版"
                const buttons = document.querySelectorAll('button, a, span[role="button"]');
                buttons.forEach(btn => {
                    const text = btn.textContent?.toLowerCase() || '';
                    if (text.includes('continue') || text.includes('web') || 
                        text.includes('browser') || text.includes('繼續')) {
                        try { btn.click(); } catch (e) {}
                    }
                });
            });
        } catch (e) {
            console.log('⚠️ APP提示處理:', e.message);
        }
    }

    async deepParsePage(page) {
        return await page.evaluate(() => {
            const result = {
                name: null,
                rating: null,
                reviewCount: null,
                businessStatus: null,
                foundSelectors: []
            };

            // 1. 店家名稱 - 更全面的選擇器
            const nameSelectors = [
                'h1[data-testid="store-title"]',
                '[data-testid="store-header-title"]',
                'h1[class*="title"]',
                'h1[class*="name"]',
                '.store-info h1',
                '.restaurant-name',
                'header h1',
                'h1',
                '[role="heading"][aria-level="1"]'
            ];

            for (const selector of nameSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element && element.textContent) {
                        const text = element.textContent.trim();
                        if (text.length > 2 && text.length < 100 && 
                            !text.includes('UberEats') && !text.includes('下載')) {
                            result.name = text;
                            result.foundSelectors.push(`店名: ${selector}`);
                            break;
                        }
                    }
                }
                if (result.name) break;
            }

            // 2. 評分 - 多重策略搜尋
            // 策略A: 直接選擇器
            const ratingSelectors = [
                '[data-testid*="rating"]',
                '[aria-label*="rating"]',
                '[aria-label*="星"]',
                '.rating',
                '.star-rating',
                'span[class*="rating"]',
                'div[class*="rating"]'
            ];

            for (const selector of ratingSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent || element.getAttribute('aria-label') || '';
                    const match = text.match(/(\d\.\d)/);
                    if (match) {
                        const rating = parseFloat(match[1]);
                        if (rating >= 1 && rating <= 5) {
                            result.rating = rating;
                            result.foundSelectors.push(`評分: ${selector} = ${text}`);
                            break;
                        }
                    }
                }
                if (result.rating) break;
            }

            // 策略B: 全頁面文字搜尋
            if (!result.rating) {
                const pageText = document.body.textContent;
                const ratingMatches = pageText.match(/(\d\.\d)\s*(?:stars?|星|\/5)/gi);
                if (ratingMatches) {
                    for (const match of ratingMatches) {
                        const rating = parseFloat(match.match(/\d\.\d/)[0]);
                        if (rating >= 1 && rating <= 5) {
                            result.rating = rating;
                            result.foundSelectors.push(`評分: 全頁搜尋 = ${match}`);
                            break;
                        }
                    }
                }
            }

            // 策略C: JSON-LD 結構化資料
            if (!result.rating) {
                const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const script of jsonLdScripts) {
                    try {
                        const data = JSON.parse(script.textContent);
                        if (data.aggregateRating && data.aggregateRating.ratingValue) {
                            result.rating = parseFloat(data.aggregateRating.ratingValue);
                            result.foundSelectors.push('評分: JSON-LD');
                            break;
                        }
                    } catch (e) {}
                }
            }

            // 3. 評論數 - 詳細調試版本
            console.log('🔍 開始搜尋評論數...');
            
            const reviewSelectors = [
                '[data-testid*="review"]',
                '[aria-label*="review"]', 
                '[aria-label*="評論"]',
                '.review-count',
                'span[class*="review"]',
                '[class*="review-count"]',
                '[data-testid*="rating"]'
            ];

            // 記錄所有找到的可能評論相關文字
            const allReviewTexts = [];
            
            for (const selector of reviewSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent || element.getAttribute('aria-label') || '';
                    if (text.includes('review') || text.includes('評論') || text.includes('則') || /\d+/.test(text)) {
                        allReviewTexts.push(`${selector}: "${text}"`);
                        
                        // 更寬鬆的數字匹配
                        const matches = [
                            text.match(/(\d+(?:,\d+)*)\s*(?:reviews?|評論|則)/i),
                            text.match(/(\d+(?:,\d+)*)\s*(?:個評論|個評價)/i),
                            text.match(/\((\d+(?:,\d+)*)\)/), // 括號內的數字
                            text.match(/(\d+(?:,\d+)*)\s*stars?/i), // 星星相關
                            text.match(/評分.*?(\d+(?:,\d+)*)/i) // 評分後面的數字
                        ];
                        
                        for (const match of matches) {
                            if (match) {
                                const count = parseInt(match[1].replace(/,/g, ''));
                                if (count > 0 && count < 100000) { // 合理範圍
                                    result.reviewCount = count;
                                    result.foundSelectors.push(`評論數: ${selector} = "${text}" (匹配: ${match[0]})`);
                                    console.log(`✅ 找到評論數: ${count} 從 "${text}"`);
                                    break;
                                }
                            }
                        }
                        if (result.reviewCount) break;
                    }
                }
                if (result.reviewCount) break;
            }

            // 記錄所有發現的評論相關文字用於調試
            result.foundSelectors.push(`所有評論相關文字: ${allReviewTexts.slice(0, 10).join('; ')}`);

            // 全頁面搜尋 - 更詳細的模式
            if (!result.reviewCount) {
                console.log('🔍 進行全頁面評論數搜尋...');
                const pageText = document.body.textContent;
                
                // 多種評論數匹配模式
                const reviewPatterns = [
                    /(\d+(?:,\d+)*)\s*(?:reviews?|評論|則評論|個評論)/gi,
                    /\((\d+(?:,\d+)*)\)\s*(?:reviews?|評論)/gi,
                    /(\d+(?:,\d+)*)\s*人評論/gi,
                    /評論.*?(\d+(?:,\d+)*)/gi,
                    /(\d+(?:,\d+)*)\s*(?:stars?|顆星)/gi
                ];
                
                for (const pattern of reviewPatterns) {
                    const matches = pageText.match(pattern);
                    if (matches) {
                        console.log(`🔍 找到匹配: ${matches.slice(0, 5).join(', ')}`);
                        
                        for (const match of matches) {
                            const numberMatch = match.match(/(\d+(?:,\d+)*)/);
                            if (numberMatch) {
                                const count = parseInt(numberMatch[1].replace(/,/g, ''));
                                if (count > 0 && count < 100000) {
                                    result.reviewCount = count;
                                    result.foundSelectors.push(`評論數: 全頁搜尋 = "${match}"`);
                                    console.log(`✅ 全頁搜尋找到評論數: ${count}`);
                                    break;
                                }
                            }
                        }
                        if (result.reviewCount) break;
                    }
                }
            }

            // 如果還是沒找到，嘗試搜尋頁面中所有的數字
            if (!result.reviewCount) {
                console.log('🔍 搜尋頁面中所有數字...');
                const allNumbers = pageText.match(/\d+/g);
                if (allNumbers) {
                    const reasonableNumbers = allNumbers
                        .map(n => parseInt(n))
                        .filter(n => n > 5 && n < 10000) // 可能的評論數範圍
                        .slice(0, 10);
                    
                    result.foundSelectors.push(`頁面中的數字: ${reasonableNumbers.join(', ')}`);
                    console.log(`🔍 頁面中的合理數字: ${reasonableNumbers.join(', ')}`);
                }
            }

            // 4. 營業狀態
            const statusKeywords = ['休息', '關閉', 'closed', '暫停', '營業中', 'open'];
            const pageText = document.body.textContent.toLowerCase();
            for (const keyword of statusKeywords) {
                if (pageText.includes(keyword)) {
                    result.businessStatus = keyword;
                    break;
                }
            }

            // 5. 如果沒有店名，從URL或標題獲取
            if (!result.name) {
                const title = document.title;
                if (title && !title.includes('Uber Eats')) {
                    result.name = title.split(' | ')[0].split(' - ')[0].trim();
                    result.foundSelectors.push('店名: 頁面標題');
                }
            }

            return result;
        });
    }

    async extractJSONData(page) {
        return await page.evaluate(() => {
            const result = { rating: null, reviewCount: null };
            
            // 搜尋頁面中的所有 script 標籤
            const scripts = document.querySelectorAll('script');
            
            for (const script of scripts) {
                const content = script.textContent || script.innerHTML;
                
                // 尋找可能包含評分資料的JSON
                if (content.includes('rating') || content.includes('stars')) {
                    try {
                        // 嘗試解析JSON片段
                        const ratingMatch = content.match(/"rating[^"]*":\s*(\d+\.?\d*)/i);
                        if (ratingMatch) {
                            const rating = parseFloat(ratingMatch[1]);
                            if (rating >= 1 && rating <= 5) {
                                result.rating = rating;
                            }
                        }

                        const reviewMatch = content.match(/"review[^"]*[Cc]ount":\s*(\d+)/i);
                        if (reviewMatch) {
                            result.reviewCount = parseInt(reviewMatch[1]);
                        }
                    } catch (e) {
                        // 忽略JSON解析錯誤
                    }
                }
            }
            
            return result;
        });
    }

    async cleanup() {
        await this.crawler.cleanup();
    }
}

// 直接測試
async function testEnhancedParser() {
    const parser = new EnhancedUberParser();
    
    try {
        const url = 'https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9?diningMode=DELIVERY';
        const result = await parser.parseUberEatsStore(url);
        
        console.log('\n🎯 最終結果:');
        console.log('='.repeat(50));
        if (result.foundSelectors) {
            console.log('🔍 發現的元素:');
            result.foundSelectors.forEach(selector => console.log(`  - ${selector}`));
        }
        
    } catch (error) {
        console.error('測試失敗:', error);
    } finally {
        await parser.cleanup();
    }
}

if (require.main === module) {
    testEnhancedParser();
}

module.exports = { EnhancedUberParser };