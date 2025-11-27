const puppeteer = require('puppeteer');
const chromium = require('@sparticuz/chromium');

/**
 * Puppeteer 爬蟲模組
 * 專為 Railway 環境優化，支援本地與雲端執行
 */
class PuppeteerCrawler {
    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    /**
     * 獲取瀏覽器實例
     */
    async getBrowser() {
        const launchOptions = {
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        };

        // 在生產環境 (Railway) 使用系統安裝的 Chrome
        if (this.isProduction || process.env.PUPPETEER_EXECUTABLE_PATH) {
            console.log('🚀 使用自定義 Chrome 路徑:', process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable');
            launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable';
        } else {
            // 本地開發環境
            console.log('💻 使用本地 Puppeteer');
        }

        return await puppeteer.launch(launchOptions);
    }

    /**
     * 爬取單個 URL
     */
    async scrapeUrl(platform, url) {
        let browser = null;
        try {
            browser = await this.getBrowser();
            const page = await browser.newPage();
            
            // 設置 User-Agent 防止被阻擋
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // 設置超時
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            let result;
            switch (platform) {
                case 'google':
                    result = await this.scrapeGoogle(page);
                    break;
                case 'uber':
                    result = await this.scrapeUber(page);
                    break;
                case 'panda':
                    result = await this.scrapePanda(page);
                    break;
                default:
                    throw new Error(`不支援的平台: ${platform}`);
            }

            return {
                success: true,
                ...result,
                url
            };

        } catch (error) {
            console.error(`❌ 爬取失敗 (${platform}): ${error.message}`);
            return {
                success: false,
                error: error.message,
                url
            };
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Google Maps 解析邏輯
     */
    async scrapeGoogle(page) {
        try {
            // 等待關鍵元素出現 (評分或評論數)
            await page.waitForSelector('div[role="main"]', { timeout: 5000 }).catch(() => {});

            return await page.evaluate(() => {
                let rating = null;
                let reviewCount = null;

                // 1. 嘗試尋找評分 (通常是 aria-label="4.5 顆星" 或類似)
                const ratingEl = document.querySelector('span[role="img"][aria-label*="星"], span[role="img"][aria-label*="star"]');
                if (ratingEl) {
                    const label = ratingEl.getAttribute('aria-label');
                    const match = label.match(/(\d+(\.\d+)?)/);
                    if (match) rating = parseFloat(match[1]);
                } else {
                     // 後備: 尋找數值文本 (如 "4.5")
                    const spans = Array.from(document.querySelectorAll('span'));
                    const ratingSpan = spans.find(s => /^\d\.\d$/.test(s.textContent.trim()));
                    if (ratingSpan) rating = parseFloat(ratingSpan.textContent.trim());
                }

                // 2. 嘗試尋找評論數 (通常是 "1,234 則評論" 或 "(1,234)")
                const buttonEls = Array.from(document.querySelectorAll('button, span'));
                for (const el of buttonEls) {
                    const text = el.textContent.trim();
                    if (text.includes('評論') || text.includes('reviews')) {
                        const match = text.match(/([\d,]+)/);
                        if (match) {
                            reviewCount = match[1].replace(/,/g, ''); // 移除逗號
                            break;
                        }
                    }
                }

                return { rating, reviewCount };
            });
        } catch (e) {
            throw new Error(`Google 解析錯誤: ${e.message}`);
        }
    }

    /**
     * UberEats 解析邏輯
     */
    async scrapeUber(page) {
         try {
             await page.waitForSelector('main', { timeout: 5000 }).catch(() => {});

             return await page.evaluate(() => {
                 let rating = null;
                 let reviewCount = null;

                 // UberEats 通常將評分顯示在頂部 header 區域
                 // 尋找類似 "4.8 (500+)" 的結構
                 
                 const ratingEls = Array.from(document.querySelectorAll('div, span'));
                 for (const el of ratingEls) {
                     // 嚴格匹配 "4.8" 這種格式，且通常在 header 裡
                     if (/^\d\.\d$/.test(el.textContent.trim())) {
                         rating = parseFloat(el.textContent.trim());
                         
                         // 評論數通常在評分旁邊
                         // 嘗試找父元素的其他子元素
                         const parent = el.parentElement;
                         if (parent) {
                             const text = parent.textContent;
                             const countMatch = text.match(/\(([\d,]+\+?)\)/);
                             if (countMatch) {
                                 reviewCount = countMatch[1];
                             }
                         }
                         break; // 找到第一個通常就是主評分
                     }
                 }

                 return { rating, reviewCount };
             });
         } catch (e) {
             throw new Error(`Uber 解析錯誤: ${e.message}`);
         }
    }

    /**
     * Foodpanda 解析邏輯
     */
    async scrapePanda(page) {
        try {
            return await page.evaluate(() => {
                let rating = null;
                let reviewCount = null;

                // Foodpanda 評分結構
                const ratingWrapper = document.querySelector('.vendor-rating'); // 舊版 class
                const newRatingEls = Array.from(document.querySelectorAll('span')); // 新版可能改動
                
                // 嘗試尋找 "4.7/5" 或 "4.7"
                for (const el of newRatingEls) {
                    const text = el.textContent.trim();
                    // 匹配 "4.7/5"
                    if (/^\d\.\d\/5$/.test(text)) {
                        rating = parseFloat(text.split('/')[0]);
                        break;
                    }
                    // 匹配 "4.7" 且有 icon
                    if (/^\d\.\d$/.test(text)) {
                        // 檢查是否有星星 icon SVG 在附近
                        if (el.parentElement.querySelector('svg')) {
                            rating = parseFloat(text);
                            
                             // 尋找評論數
                            const parentText = el.parentElement.textContent;
                            const countMatch = parentText.match(/\(([\d,]+\+?)\)/);
                            if (countMatch) reviewCount = countMatch[1];
                            break;
                        }
                    }
                }

                return { rating, reviewCount };
            });
        } catch (e) {
            throw new Error(`Panda 解析錯誤: ${e.message}`);
        }
    }
}

module.exports = { PuppeteerCrawler };
