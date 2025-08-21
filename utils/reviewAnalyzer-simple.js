const { SimpleCrawler } = require('./simpleCrawler');

/**
 * 簡化版評價分析器 - 雲端環境適用
 * 不依賴Puppeteer，確保基本功能可用
 */
class SimpleReviewAnalyzer {
    constructor() {
        this.crawler = new SimpleCrawler();
        
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
            
            console.log(`🔍 簡化版分析平台: ${platform}, URL: ${url.substring(0, 50)}...`);

            // 使用簡化版爬蟲
            const result = await this.crawler.analyzeRestaurant(url, platform);
            
            return result;

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