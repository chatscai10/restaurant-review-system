const { SimpleCrawler } = require('./simpleCrawler');
const { RealDataCrawler } = require('./realDataCrawler');

/**
 * 簡化版評價分析器 - 雲端環境適用
 * 不依賴Puppeteer，確保基本功能可用
 */
class SimpleReviewAnalyzer {
    constructor() {
        this.crawler = new SimpleCrawler();
        this.realCrawler = new RealDataCrawler();
        
        // 平台識別模式
        this.platformPatterns = {
            google: [
                'maps.google.com',
                'goo.gl/maps',
                'google.com/maps',
                'maps.app.goo.gl'
            ],
            uber: [
                'ubereats.com',
                'uber.com/tw/eat'
            ],
            panda: [
                'foodpanda.com.tw',
                'foodpanda.tw', 
                'foodpanda.page.link',
                'foodpanda.com'
            ]
        };
    }

    /**
     * 分析網址並提取評價信息
     */
    async analyzeUrl(url, expectedPlatform = null) {
        try {
            if (!url || typeof url !== 'string') {
                throw new Error('無效的網址');
            }

            // 識別平台
            const platform = expectedPlatform || this.identifyPlatform(url);
            
            console.log(`🔍 真實數據分析平台: ${platform}, URL: ${url.substring(0, 50)}...`);

            // 首先嘗試真實數據抓取
            try {
                let data;
                switch (platform) {
                    case 'google':
                        data = await this.realCrawler.scrapeGoogleMapsReal(url);
                        break;
                    case 'uber':
                        data = await this.realCrawler.scrapeUberEatsReal(url);
                        break;
                    case 'panda':
                        data = await this.realCrawler.scrapeFoodpandaReal(url);
                        break;
                    default:
                        throw new Error(`不支援的平台: ${platform}`);
                }

                // 格式化真實數據結果
                return {
                    success: true,
                    platform: platform,
                    storeName: data.name || '未知餐廳',
                    rating: data.rating,
                    reviewCount: data.reviewCount,
                    deliveryTime: data.deliveryTime,
                    deliveryFee: data.deliveryFee,
                    address: data.address,
                    phone: data.phone,
                    openingHours: data.openingHours,
                    priceLevel: data.priceLevel,
                    reviews: [],
                    url: url,
                    lastUpdated: new Date().toISOString(),
                    source: 'real-data-crawler',
                    note: data.note
                };

            } catch (realError) {
                console.warn(`真實數據抓取失敗，使用備用數據: ${realError.message}`);
                
                // 如果真實數據抓取失敗，使用簡化版作為備用
                const result = await this.crawler.analyzeRestaurant(url, platform);
                result.note = '真實數據暫時無法獲取，顯示為參考數據';
                result.source = 'fallback-data';
                return result;
            }

        } catch (error) {
            console.error(`❌ 簡化版分析失敗 [${expectedPlatform}]:`, error.message);
            return {
                success: false,
                platform: expectedPlatform,
                error: error.message,
                url: url,
                source: 'simple-analyzer'
            };
        }
    }

    /**
     * 識別網址所屬平台
     */
    identifyPlatform(url) {
        const lowerUrl = url.toLowerCase();
        
        for (const [platform, patterns] of Object.entries(this.platformPatterns)) {
            if (patterns.some(pattern => lowerUrl.includes(pattern))) {
                return platform;
            }
        }
        
        return 'unknown';
    }

    /**
     * 驗證網址是否完整
     */
    isCompleteUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 批量分析多個網址
     */
    async analyzeMultipleUrls(urls) {
        console.log(`🔍 開始批量分析 ${urls.length} 個網址...`);
        
        const results = [];
        
        for (const urlData of urls) {
            const { url, platform } = urlData;
            console.log(`📋 分析: ${platform} - ${url.substring(0, 30)}...`);
            
            const result = await this.analyzeUrl(url, platform);
            results.push({
                platform,
                url,
                ...result
            });
            
            // 避免請求過於頻繁
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`✅ 批量分析完成，成功: ${results.filter(r => r.success).length}/${results.length}`);
        return results;
    }
}

module.exports = { SimpleReviewAnalyzer };