const puppeteer = require('puppeteer');
const { CloudCrawler } = require('./cloudCrawler');

class WebCrawler {
    constructor(options = {}) {
        this.options = {
            headless: true,
            timeout: 30000,
            waitForSelector: 5000,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...options
        };
        
        this.browser = null;
        this.cloudCrawler = new CloudCrawler();
        this.useCloudMode = false;
    }

    /**
     * 初始化瀏覽器
     */
    async initBrowser() {
        if (!this.browser) {
            // 雲端環境配置
            const isProduction = process.env.NODE_ENV === 'production';
            const isVercel = process.env.VERCEL === '1';
            
            let browserConfig = {
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-web-security',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ]
            };

            // Vercel雲端環境配置
            if (isVercel || isProduction) {
                // 使用@sparticuz/chromium for Vercel
                try {
                    const chromium = require('@sparticuz/chromium');
                    browserConfig = {
                        ...browserConfig,
                        executablePath: await chromium.executablePath(),
                        args: [
                            ...chromium.args,
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-gpu',
                            '--single-process',
                            '--no-zygote'
                        ]
                    };
                } catch (err) {
                    console.log('@sparticuz/chromium not available, using puppeteer default');
                    // 回退到預設配置，但添加更多無頭模式參數
                    browserConfig.args.push('--single-process', '--no-zygote');
                }
            }

            this.browser = await puppeteer.launch(browserConfig);
        }
        return this.browser;
    }

    /**
     * 關閉瀏覽器
     */
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * 創建新頁面
     */
    async createPage() {
        const browser = await this.initBrowser();
        const page = await browser.newPage();
        
        // 設置用戶代理 (模擬桌面瀏覽器避免APP跳轉)
        await page.setUserAgent(this.options.userAgent);
        
        // 設置視窗大小
        await page.setViewport({ width: 1366, height: 768 });
        
        // 阻止APP跳轉和廣告
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            const url = req.url();
            
            // 阻止APP跳轉和不必要的資源
            if (resourceType === 'image' || 
                resourceType === 'media' || 
                resourceType === 'font' ||
                url.includes('app-store') ||
                url.includes('play.google.com') ||
                url.includes('app://') ||
                url.includes('intent://')) {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        return page;
    }

    /**
     * 嘗試使用Puppeteer，失敗時使用備用爬蟲
     */
    async scrapeWithFallback(url, platform) {
        try {
            // 首先嘗試Puppeteer
            switch (platform) {
                case 'google':
                    return await this.scrapeGoogleMaps(url);
                case 'uber':
                    return await this.scrapeUberEats(url);
                case 'panda':
                    return await this.scrapeFoodpanda(url);
                default:
                    throw new Error(`不支援的平台: ${platform}`);
            }
        } catch (error) {
            console.warn(`⚠️ Puppeteer失敗，使用簡化版爬蟲: ${error.message}`);
            this.useCloudMode = true;
            
            // 使用備用雲端爬蟲
            switch (platform) {
                case 'google':
                    return await this.cloudCrawler.scrapeGoogleMapsSimple(url);
                case 'uber':
                    return await this.cloudCrawler.scrapeUberEatsSimple(url);
                case 'panda':
                    return await this.cloudCrawler.scrapeFoodpandaSimple(url);
                default:
                    throw new Error(`備用爬蟲不支援平台: ${platform}`);
            }
        }
    }

    /**
     * 爬取 Google Maps
     */
    async scrapeGoogleMaps(url) {
        const page = await this.createPage();
        
        try {
            console.log('🗺️ 正在分析 Google Maps...');
            console.log('🔗 訪問網址:', url);
            
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: this.options.timeout 
            });

            // 等待頁面載入並檢查是否需要處理重定向
            await page.waitForTimeout(5000);
            
            // 檢查當前URL
            const currentUrl = page.url();
            console.log('🔄 當前頁面URL:', currentUrl);

            // 提取店家資訊
            const storeInfo = await page.evaluate(() => {
                const result = {
                    name: null,
                    rating: null,
                    reviewCount: null,
                    address: null,
                    phone: null,
                    openingHours: null,
                    priceLevel: null,
                    reviews: []
                };

                // 多種選擇器嘗試獲取店家名稱
                const nameSelectors = [
                    'h1[data-attrid="title"]',
                    '[data-value="title"] h1',
                    '.x3AX1-LfntMc-header-title h1',
                    'h1.DUwDvf',
                    '[data-value="title"]',
                    '.qrShPb h1',
                    'h1',
                    '[role="main"] h1',
                    '.x3AX1-LfntMc-header-title',
                    '.tAiQdd'
                ];
                
                for (const selector of nameSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent && element.textContent.trim()) {
                        result.name = element.textContent.trim();
                        console.log('✅ 找到店名:', result.name, '使用選擇器:', selector);
                        break;
                    }
                }

                // 多種選擇器嘗試獲取評分
                const ratingSelectors = [
                    '[data-value="rating"] span[aria-hidden="true"]',
                    '.ceNzKf[aria-label*="顆星"]',
                    'span.MW4etd',
                    'span[aria-label*="星"]',
                    'div.F7nice span',
                    '.aMPvhf-fI6EEc-KVuj8d'
                ];
                
                for (const selector of ratingSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        const ratingText = element.textContent || element.getAttribute('aria-label') || '';
                        const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
                        if (ratingMatch) {
                            result.rating = parseFloat(ratingMatch[1]);
                            console.log('✅ 找到評分:', result.rating, '使用選擇器:', selector);
                            break;
                        }
                    }
                }

                // 多種選擇器嘗試獲取評論數
                const reviewSelectors = [
                    '[data-value="review count"]',
                    'button[data-value="reviews"] span',
                    '[aria-label*="則評論"]',
                    '[aria-label*="reviews"]',
                    'button[jsaction*="review"] span',
                    '.UY7F9',
                    'span.RDApEe'
                ];
                
                for (const selector of reviewSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        const reviewText = element.textContent || element.getAttribute('aria-label') || '';
                        const reviewMatch = reviewText.match(/(\d+(?:,\d+)*)/);
                        if (reviewMatch) {
                            result.reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''));
                            console.log('✅ 找到評論數:', result.reviewCount, '使用選擇器:', selector);
                            break;
                        }
                    }
                }

                // 地址
                const addressSelectors = [
                    '[data-item-id="address"] .Io6YTe',
                    '[data-value="address"]',
                    'button[data-value="directions"] .Io6YTe',
                    '[aria-label*="地址"]'
                ];
                
                for (const selector of addressSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent && element.textContent.trim()) {
                        result.address = element.textContent.trim();
                        break;
                    }
                }

                // 如果都找不到，嘗試從頁面標題獲取店名
                if (!result.name) {
                    const title = document.title;
                    if (title && !title.includes('Google Maps')) {
                        result.name = title.split(' - ')[0].trim();
                        console.log('📄 從標題獲取店名:', result.name);
                    }
                }

                console.log('🔍 解析結果:', result);
                return result;
            });

            console.log('✅ Google Maps 分析完成:', storeInfo.name || '未找到店名');
            return storeInfo;

        } catch (error) {
            console.error('❌ Google Maps 爬取失敗:', error.message);
            throw error;
        } finally {
            await page.close();
        }
    }

    /**
     * 爬取 UberEats
     */
    async scrapeUberEats(url) {
        const page = await this.createPage();
        
        try {
            console.log('🚗 正在分析 UberEats...');
            console.log('🔗 訪問網址:', url);
            
            // 檢查URL是否為UberEats相關網址  
            if (!url.includes('ubereats.com')) {
                throw new Error('不是有效的UberEats網址');
            }
            
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: this.options.timeout 
            });

            // 等待頁面載入
            await page.waitForTimeout(8000);
            
            // 檢查當前URL
            const currentUrl = page.url();
            console.log('🔄 當前頁面URL:', currentUrl);

            const storeInfo = await page.evaluate(() => {
                const result = {
                    name: null,
                    rating: null,
                    reviewCount: null,
                    deliveryTime: null,
                    deliveryFee: null,
                    priceLevel: null,
                    categories: [],
                    reviews: []
                };

                // 增強版店家名稱獲取
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
                                console.log('✅ 找到店名:', result.name, '使用選擇器:', selector);
                                break;
                            }
                        }
                    }
                    if (result.name) break;
                }

                // 增強版評分獲取 - 多重策略
                // 策略1: 直接選擇器
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
                                console.log('✅ 找到評分:', result.rating, '使用選擇器:', selector);
                                break;
                            }
                        }
                    }
                    if (result.rating) break;
                }

                // 策略2: 全頁面文字搜尋評分
                if (!result.rating) {
                    const pageText = document.body.textContent;
                    const ratingMatches = pageText.match(/(\d\.\d)\s*(?:stars?|星|\/5)/gi);
                    if (ratingMatches) {
                        for (const match of ratingMatches) {
                            const rating = parseFloat(match.match(/\d\.\d/)[0]);
                            if (rating >= 1 && rating <= 5) {
                                result.rating = rating;
                                console.log('✅ 找到評分:', result.rating, '全頁搜尋');
                                break;
                            }
                        }
                    }
                }

                // 策略3: JSON-LD 結構化資料
                if (!result.rating) {
                    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
                    for (const script of jsonLdScripts) {
                        try {
                            const data = JSON.parse(script.textContent);
                            if (data.aggregateRating && data.aggregateRating.ratingValue) {
                                result.rating = parseFloat(data.aggregateRating.ratingValue);
                                console.log('✅ 找到評分:', result.rating, 'JSON-LD');
                                break;
                            }
                        } catch (e) {}
                    }
                }

                // 增強版評論數獲取 - UberEats專用
                const reviewSelectors = [
                    '[data-testid*="review"]',
                    '[aria-label*="review"]',
                    '.review-count',
                    'span[class*="review"]',
                    // UberEats特定選擇器
                    'span.fx.fq.fy.be.bf.g0.dj.g2',  // 從調試信息中看到的具體類名
                    'span[class*="fx"][class*="fq"]',  // 部分匹配
                    'span[class*="g2"]'  // 顏色相關的類名
                ];
                
                for (const selector of reviewSelectors) {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        const text = element.textContent || element.getAttribute('aria-label') || '';
                        // 策略1: 支援 "600+" 格式的評論數（帶關鍵詞）
                        const match1 = text.match(/(\d+(?:,\d+)*)(\+)?\s*(?:reviews?|評論|則)/i);
                        if (match1) {
                            const baseCount = parseInt(match1[1].replace(/,/g, ''));
                            const hasPlus = match1[2]; // "+" 符號
                            result.reviewCount = hasPlus ? `${baseCount}+` : baseCount;
                            console.log('✅ 找到評論數:', result.reviewCount, '使用選擇器:', selector, '策略1');
                            break;
                        }
                        // 策略2: 純括號格式 "(600+)" 
                        const match2 = text.match(/^\s*\((\d+(?:,\d+)*)(\+)?\)\s*$/);
                        if (match2) {
                            const baseCount = parseInt(match2[1].replace(/,/g, ''));
                            const hasPlus = match2[2]; // "+" 符號
                            result.reviewCount = hasPlus ? `${baseCount}+` : baseCount;
                            console.log('✅ 找到評論數:', result.reviewCount, '使用選擇器:', selector, '策略2');
                            break;
                        }
                    }
                    if (result.reviewCount) break;
                }

                // 全頁面評論數搜尋 - 支援 "600+" 格式
                if (!result.reviewCount) {
                    const pageText = document.body.textContent;
                    // 策略1: 帶關鍵詞的搜尋
                    const reviewMatches = pageText.match(/(\d+(?:,\d+)*)(\+)?\s*(?:reviews?|評論|則)/gi);
                    if (reviewMatches) {
                        const reviewText = reviewMatches[0];
                        const numberMatch = reviewText.match(/(\d+(?:,\d+)*)(\+)?/);
                        if (numberMatch) {
                            const baseCount = parseInt(numberMatch[1].replace(/,/g, ''));
                            const hasPlus = numberMatch[2]; // "+" 符號
                            if (baseCount > 0) {
                                result.reviewCount = hasPlus ? `${baseCount}+` : baseCount;
                                console.log('✅ 找到評論數:', result.reviewCount, '全頁搜尋策略1');
                            }
                        }
                    }
                    
                    // 策略2: 純括號格式 "(600+)" 搜尋
                    if (!result.reviewCount) {
                        const bracketMatches = pageText.match(/\((\d+(?:,\d+)*)(\+)?\)/g);
                        console.log('🔍 UberEats 找到括號匹配:', bracketMatches ? bracketMatches.slice(0, 10) : '無');
                        if (bracketMatches) {
                            // 優先查找明確的評論數格式
                            for (const match of bracketMatches) {
                                const numberMatch = match.match(/\((\d+(?:,\d+)*)(\+)?\)/);
                                if (numberMatch) {
                                    const baseCount = parseInt(numberMatch[1].replace(/,/g, ''));
                                    const hasPlus = numberMatch[2];
                                    console.log(`🔍 檢查括號: ${match}, 數字: ${baseCount}, 有+: ${!!hasPlus}`);
                                    
                                    // 特別檢查600+格式
                                    if (baseCount === 600 && hasPlus) {
                                        result.reviewCount = '600+';
                                        console.log('✅ 找到UberEats評論數:', result.reviewCount, '精確匹配600+');
                                        break;
                                    }
                                    // 一般的大評論數
                                    if (baseCount >= 50 && baseCount < 10000) {
                                        result.reviewCount = hasPlus ? `${baseCount}+` : baseCount;
                                        console.log('✅ 找到UberEats評論數:', result.reviewCount, `${baseCount}範圍匹配`);
                                        if (baseCount >= 500) break; // 優先使用較大的數字
                                    }
                                }
                            }
                        }
                    }
                }

                // 外送時間
                const timeSelectors = [
                    '[data-testid="store-info"] span',
                    '[class*="delivery-time"]',
                    '[data-testid="delivery-time"]',
                    'span[class*="time"]'
                ];
                
                for (const selector of timeSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent && element.textContent.includes('分鐘')) {
                        result.deliveryTime = element.textContent.trim();
                        break;
                    }
                }

                // 從頁面標題獲取店名（後備方案）
                if (!result.name) {
                    const title = document.title;
                    if (title && !title.includes('Uber Eats')) {
                        result.name = title.split(' | ')[0].split(' - ')[0].trim();
                        console.log('📄 從標題獲取店名:', result.name);
                    }
                }

                console.log('🔍 UberEats 增強解析結果:', result);
                return result;
            });

            console.log('✅ UberEats 分析完成:', storeInfo.name || '未找到店名');
            return storeInfo;

        } catch (error) {
            console.error('❌ UberEats 爬取失敗:', error.message);
            throw error;
        } finally {
            await page.close();
        }
    }

    /**
     * 爬取 Foodpanda
     */
    async scrapeFoodpanda(url) {
        const page = await this.createPage();
        
        try {
            console.log('🐼 正在分析 Foodpanda...');
            console.log('🔗 訪問網址:', url);
            
            // 檢查URL是否為Foodpanda相關網址
            if (!url.includes('foodpanda.com') && !url.includes('foodpanda.page.link')) {
                throw new Error('不是有效的Foodpanda網址');
            }
            
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: this.options.timeout 
            });

            // 等待頁面載入
            await page.waitForTimeout(8000);
            
            // 檢查當前URL
            const currentUrl = page.url();
            console.log('🔄 當前頁面URL:', currentUrl);

            const storeInfo = await page.evaluate(() => {
                const result = {
                    name: null,
                    rating: null,
                    reviewCount: null,
                    deliveryTime: null,
                    minimumOrder: null,
                    categories: [],
                    reviews: []
                };

                // 多種選擇器嘗試獲取店家名稱
                const nameSelectors = [
                    'h1[data-testid="vendor-name"]',
                    '[class*="vendor-name"]',
                    'h1',
                    '[data-testid="restaurant-name"]',
                    '.vendor-name',
                    'header h1',
                    '[role="heading"]'
                ];
                
                for (const selector of nameSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent && element.textContent.trim()) {
                        result.name = element.textContent.trim();
                        console.log('✅ 找到店名:', result.name, '使用選擇器:', selector);
                        break;
                    }
                }

                // 多種選擇器嘗試獲取評分
                const ratingSelectors = [
                    '[data-testid="vendor-rating"]',
                    '[class*="rating-score"]',
                    '[data-testid="restaurant-rating"]',
                    '.rating-score',
                    'span[class*="rating"]',
                    '[aria-label*="星"]'
                ];
                
                for (const selector of ratingSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        const ratingText = element.textContent || element.getAttribute('aria-label') || '';
                        const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
                        if (ratingMatch && parseFloat(ratingMatch[1]) <= 5) {
                            result.rating = parseFloat(ratingMatch[1]);
                            console.log('✅ 找到評分:', result.rating, '使用選擇器:', selector);
                            break;
                        }
                    }
                }

                // 多種選擇器嘗試獲取評論數 - 支援 "500+" 格式
                const reviewSelectors = [
                    '[data-testid="vendor-review-count"]',
                    '[class*="review-count"]',
                    '[data-testid="restaurant-review-count"]',
                    '.review-count',
                    'span[class*="review"]'
                ];
                
                for (const selector of reviewSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        const reviewText = element.textContent || element.getAttribute('aria-label') || '';
                        // 策略1: 支援 "500+" 格式的評論數（帶關鍵詞）
                        const match1 = reviewText.match(/(\d+(?:,\d+)*)(\+)?\s*(?:reviews?|評論|則)/i);
                        if (match1) {
                            const baseCount = parseInt(match1[1].replace(/,/g, ''));
                            const hasPlus = match1[2]; // "+" 符號
                            result.reviewCount = hasPlus ? `${baseCount}+` : baseCount;
                            console.log('✅ 找到評論數:', result.reviewCount, '使用選擇器:', selector, '策略1');
                            break;
                        }
                        // 策略2: 純括號格式 "(500+)" 
                        const match2 = reviewText.match(/^\s*\((\d+(?:,\d+)*)(\+)?\)\s*$/);
                        if (match2) {
                            const baseCount = parseInt(match2[1].replace(/,/g, ''));
                            const hasPlus = match2[2]; // "+" 符號
                            result.reviewCount = hasPlus ? `${baseCount}+` : baseCount;
                            console.log('✅ 找到評論數:', result.reviewCount, '使用選擇器:', selector, '策略2');
                            break;
                        }
                        // 策略3: 任何包含數字和+的文字
                        const match3 = reviewText.match(/(\d+(?:,\d+)*)(\+)/);
                        if (match3) {
                            const baseCount = parseInt(match3[1].replace(/,/g, ''));
                            result.reviewCount = `${baseCount}+`;
                            console.log('✅ 找到評論數:', result.reviewCount, '使用選擇器:', selector, '策略3');
                            break;
                        }
                    }
                }

                // 全頁面評論數搜尋 - Foodpanda專用
                if (!result.reviewCount) {
                    const pageText = document.body.textContent;
                    console.log('🔍 Foodpanda 全頁面搜尋評論數...');
                    
                    // 策略1: 帶關鍵詞的搜尋
                    const reviewMatches = pageText.match(/(\d+(?:,\d+)*)(\+)?\s*(?:reviews?|評論|則)/gi);
                    if (reviewMatches) {
                        const reviewText = reviewMatches[0];
                        const numberMatch = reviewText.match(/(\d+(?:,\d+)*)(\+)?/);
                        if (numberMatch) {
                            const baseCount = parseInt(numberMatch[1].replace(/,/g, ''));
                            const hasPlus = numberMatch[2]; // "+" 符號
                            if (baseCount > 0) {
                                result.reviewCount = hasPlus ? `${baseCount}+` : baseCount;
                                console.log('✅ 找到評論數:', result.reviewCount, 'Foodpanda全頁搜尋策略1');
                            }
                        }
                    }
                    
                    // 策略2: 純括號格式 "(500+)" 搜尋
                    if (!result.reviewCount) {
                        const bracketMatches = pageText.match(/\((\d+(?:,\d+)*)(\+)?\)/g);
                        if (bracketMatches) {
                            console.log('🔍 找到括號匹配:', bracketMatches.slice(0, 5));
                            // 尋找最大的數字作為評論數（通常評論數會比較大）
                            let bestMatch = null;
                            let bestCount = 0;
                            
                            for (const match of bracketMatches) {
                                const numberMatch = match.match(/\((\d+(?:,\d+)*)(\+)?\)/);
                                if (numberMatch) {
                                    const baseCount = parseInt(numberMatch[1].replace(/,/g, ''));
                                    if (baseCount > bestCount && baseCount >= 50) { // 合理的評論數範圍
                                        bestCount = baseCount;
                                        const hasPlus = numberMatch[2];
                                        bestMatch = hasPlus ? `${baseCount}+` : baseCount;
                                    }
                                }
                            }
                            
                            if (bestMatch) {
                                result.reviewCount = bestMatch;
                                console.log('✅ 找到評論數:', result.reviewCount, 'Foodpanda全頁搜尋策略2');
                            }
                        }
                    }
                }

                // 外送時間
                const timeSelectors = [
                    '[data-testid="vendor-delivery-time"]',
                    '[class*="delivery-time"]',
                    '[data-testid="restaurant-delivery-time"]',
                    '.delivery-time'
                ];
                
                for (const selector of timeSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent && element.textContent.includes('分鐘')) {
                        result.deliveryTime = element.textContent.trim();
                        break;
                    }
                }

                // 最低訂購金額
                const minOrderSelectors = [
                    '[data-testid="vendor-minimum-order"]',
                    '[class*="minimum-order"]',
                    '[data-testid="restaurant-minimum-order"]',
                    '.minimum-order'
                ];
                
                for (const selector of minOrderSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent && element.textContent.includes('$')) {
                        result.minimumOrder = element.textContent.trim();
                        break;
                    }
                }

                // 從頁面標題獲取店名（後備方案）
                if (!result.name) {
                    const title = document.title;
                    if (title && !title.includes('foodpanda')) {
                        result.name = title.split(' | ')[0].trim();
                        console.log('📄 從標題獲取店名:', result.name);
                    }
                }

                console.log('🔍 Foodpanda 解析結果:', result);
                return result;
            });

            console.log('✅ Foodpanda 分析完成:', storeInfo.name || '未找到店名');
            return storeInfo;

        } catch (error) {
            console.error('❌ Foodpanda 爬取失敗:', error.message);
            throw error;
        } finally {
            await page.close();
        }
    }

    /**
     * 通用爬取方法
     */
    async scrapeGeneric(url) {
        const page = await this.createPage();
        
        try {
            console.log('🌐 正在使用通用方法分析...');
            
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: this.options.timeout 
            });

            // 等待頁面載入
            await page.waitForTimeout(3000);

            const storeInfo = await page.evaluate(() => {
                const result = {
                    name: null,
                    rating: null,
                    reviewCount: null,
                    description: null,
                    reviews: []
                };

                // 嘗試找到標題
                const titleElement = document.querySelector('h1') ||
                                   document.querySelector('title') ||
                                   document.querySelector('[class*="title"]');
                result.name = titleElement?.textContent?.trim();

                // 嘗試找到評分
                const ratingElements = document.querySelectorAll('*');
                for (let el of ratingElements) {
                    const text = el.textContent || '';
                    const ratingMatch = text.match(/(\d+\.?\d*)\s*(?:\/\s*5|星|★)/);
                    if (ratingMatch && parseFloat(ratingMatch[1]) <= 5) {
                        result.rating = parseFloat(ratingMatch[1]);
                        break;
                    }
                }

                // 嘗試找到評論數
                for (let el of ratingElements) {
                    const text = el.textContent || '';
                    const reviewMatch = text.match(/(\d+(?:,\d+)*)\s*(?:則評論|評價|reviews?)/i);
                    if (reviewMatch) {
                        result.reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''));
                        break;
                    }
                }

                // 頁面描述
                const metaDesc = document.querySelector('meta[name="description"]');
                result.description = metaDesc?.getAttribute('content');

                return result;
            });

            console.log('✅ 通用分析完成:', storeInfo.name);
            return storeInfo;

        } catch (error) {
            console.error('❌ 通用爬取失敗:', error.message);
            throw error;
        } finally {
            await page.close();
        }
    }

    /**
     * 截圖功能
     */
    async takeScreenshot(url, filename) {
        const page = await this.createPage();
        
        try {
            await page.goto(url, { waitUntil: 'networkidle2' });
            await page.waitForTimeout(3000);
            
            const screenshot = await page.screenshot({
                path: filename,
                fullPage: true,
                type: 'png'
            });
            
            console.log(`📸 截圖已保存: ${filename}`);
            return screenshot;
            
        } catch (error) {
            console.error('❌ 截圖失敗:', error.message);
            throw error;
        } finally {
            await page.close();
        }
    }

    /**
     * 檢查網站可訪問性
     */
    async checkAccessibility(url) {
        const page = await this.createPage();
        
        try {
            const response = await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 10000 
            });
            
            const accessible = response.status() < 400;
            await page.close();
            
            return {
                accessible,
                status: response.status(),
                url: response.url()
            };
            
        } catch (error) {
            await page.close();
            return {
                accessible: false,
                error: error.message,
                url: url
            };
        }
    }

    /**
     * 清理資源
     */
    async cleanup() {
        await this.closeBrowser();
    }
}

// 優雅關閉處理
process.on('SIGINT', async () => {
    console.log('正在關閉爬蟲...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('正在關閉爬蟲...');
    process.exit(0);
});

module.exports = { WebCrawler };