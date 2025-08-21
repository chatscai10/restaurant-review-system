const { WebCrawler } = require('./webCrawler');

class ReviewAnalyzer {
    constructor() {
        this.crawler = new WebCrawler();
        
        // 平台識別模式
        this.platformPatterns = {
            google: [
                'maps.google.com',
                'goo.gl/maps',
                'google.com/maps'
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
            
            console.log(`🔍 分析平台: ${platform}, URL: ${url.substring(0, 50)}...`);

            // 根據平台選擇分析方法
            switch (platform) {
                case 'google':
                    return await this.analyzeGoogleMaps(url);
                case 'uber':
                    return await this.analyzeUberEats(url);
                case 'panda':
                    return await this.analyzeFoodpanda(url);
                default:
                    // 通用分析方法
                    return await this.analyzeGeneric(url, platform);
            }

        } catch (error) {
            console.error(`❌ 分析失敗 [${expectedPlatform}]:`, error.message);
            return {
                success: false,
                platform: expectedPlatform,
                error: error.message,
                url: url
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
     * 分析 Google Maps
     */
    async analyzeGoogleMaps(url) {
        try {
            const data = await this.crawler.scrapeGoogleMaps(url);
            
            return {
                success: true,
                platform: 'google',
                storeName: data.name || '未知店家',
                rating: data.rating,
                reviewCount: data.reviewCount,
                address: data.address,
                phone: data.phone,
                openingHours: data.openingHours,
                priceLevel: data.priceLevel,
                reviews: data.reviews || [],
                url: url,
                lastUpdated: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Google Maps 分析失敗: ${error.message}`);
        }
    }

    /**
     * 分析 UberEats
     */
    async analyzeUberEats(url) {
        try {
            const data = await this.crawler.scrapeUberEats(url);
            
            return {
                success: true,
                platform: 'uber',
                storeName: data.name || '未知店家',
                rating: data.rating,
                reviewCount: data.reviewCount,
                deliveryTime: data.deliveryTime,
                deliveryFee: data.deliveryFee,
                priceLevel: data.priceLevel,
                categories: data.categories,
                reviews: data.reviews || [],
                url: url,
                lastUpdated: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`UberEats 分析失敗: ${error.message}`);
        }
    }

    /**
     * 分析 Foodpanda
     */
    async analyzeFoodpanda(url) {
        try {
            const data = await this.crawler.scrapeFoodpanda(url);
            
            return {
                success: true,
                platform: 'panda',
                storeName: data.name || '未知店家',
                rating: data.rating,
                reviewCount: data.reviewCount,
                deliveryTime: data.deliveryTime,
                minimumOrder: data.minimumOrder,
                categories: data.categories,
                reviews: data.reviews || [],
                url: url,
                lastUpdated: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Foodpanda 分析失敗: ${error.message}`);
        }
    }

    /**
     * 通用分析方法 (用於未知平台或後備方案)
     */
    async analyzeGeneric(url, platform) {
        try {
            const data = await this.crawler.scrapeGeneric(url);
            
            return {
                success: true,
                platform: platform || 'unknown',
                storeName: data.name || '未知店家',
                rating: data.rating,
                reviewCount: data.reviewCount || 0,
                description: data.description,
                reviews: data.reviews || [],
                url: url,
                lastUpdated: new Date().toISOString(),
                note: '使用通用分析方法'
            };

        } catch (error) {
            throw new Error(`通用分析失敗: ${error.message}`);
        }
    }

    /**
     * 批量分析多個網址
     */
    async analyzeBatch(urls) {
        const results = [];
        
        for (const urlData of urls) {
            try {
                const result = await this.analyzeUrl(urlData.url, urlData.platform);
                results.push({
                    ...result,
                    storeName: urlData.storeName || result.storeName
                });
            } catch (error) {
                results.push({
                    success: false,
                    platform: urlData.platform,
                    error: error.message,
                    url: urlData.url,
                    storeName: urlData.storeName
                });
            }
        }
        
        return results;
    }

    /**
     * 生成分析報告
     */
    generateReport(results) {
        const report = {
            summary: {
                totalAnalyzed: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                averageRating: 0,
                totalReviews: 0
            },
            platforms: {},
            insights: []
        };

        const successfulResults = results.filter(r => r.success && r.rating);
        
        if (successfulResults.length > 0) {
            // 計算平均評分
            const totalRating = successfulResults.reduce((sum, r) => sum + r.rating, 0);
            report.summary.averageRating = totalRating / successfulResults.length;
            
            // 計算總評論數
            report.summary.totalReviews = successfulResults.reduce((sum, r) => sum + (r.reviewCount || 0), 0);
            
            // 按平台分組
            successfulResults.forEach(result => {
                if (!report.platforms[result.platform]) {
                    report.platforms[result.platform] = {
                        count: 0,
                        averageRating: 0,
                        totalReviews: 0,
                        stores: []
                    };
                }
                
                const platformData = report.platforms[result.platform];
                platformData.count++;
                platformData.totalReviews += result.reviewCount || 0;
                platformData.stores.push({
                    name: result.storeName,
                    rating: result.rating,
                    reviewCount: result.reviewCount
                });
            });
            
            // 計算各平台平均評分
            Object.keys(report.platforms).forEach(platform => {
                const platformData = report.platforms[platform];
                const totalRating = platformData.stores.reduce((sum, store) => sum + store.rating, 0);
                platformData.averageRating = totalRating / platformData.count;
            });
            
            // 生成洞察
            report.insights = this.generateInsights(report);
        }
        
        return report;
    }

    /**
     * 生成分析洞察
     */
    generateInsights(report) {
        const insights = [];
        const avgRating = report.summary.averageRating;
        
        // 整體表現評估
        if (avgRating >= 4.5) {
            insights.push('整體表現優秀，客戶滿意度很高');
        } else if (avgRating >= 4.0) {
            insights.push('整體表現良好，有進一步提升空間');
        } else if (avgRating >= 3.5) {
            insights.push('整體表現一般，建議重點改善服務品質');
        } else {
            insights.push('整體表現需要改善，建議全面檢視營運流程');
        }
        
        // 平台比較
        const platforms = Object.entries(report.platforms);
        if (platforms.length > 1) {
            const bestPlatform = platforms.reduce((best, current) => 
                current[1].averageRating > best[1].averageRating ? current : best
            );
            const worstPlatform = platforms.reduce((worst, current) => 
                current[1].averageRating < worst[1].averageRating ? current : worst
            );
            
            if (bestPlatform[1].averageRating - worstPlatform[1].averageRating > 0.5) {
                insights.push(`${bestPlatform[0]} 平台表現最佳 (${bestPlatform[1].averageRating.toFixed(1)})，${worstPlatform[0]} 平台需要改善 (${worstPlatform[1].averageRating.toFixed(1)})`);
            }
        }
        
        // 評論數量分析
        if (report.summary.totalReviews < 50) {
            insights.push('評論數量較少，建議鼓勵客戶留下評價');
        } else if (report.summary.totalReviews > 500) {
            insights.push('評論數量豐富，顯示高度的客戶互動');
        }
        
        return insights;
    }

    /**
     * 驗證網址格式
     */
    validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 清理和標準化網址
     */
    normalizeUrl(url) {
        try {
            const urlObj = new URL(url);
            // 移除追蹤參數
            const cleanParams = new URLSearchParams();
            
            // Google Maps 保留重要參數
            if (urlObj.hostname.includes('google')) {
                ['place_id', 'cid', 'q'].forEach(param => {
                    if (urlObj.searchParams.has(param)) {
                        cleanParams.set(param, urlObj.searchParams.get(param));
                    }
                });
            }
            
            urlObj.search = cleanParams.toString();
            return urlObj.toString();
            
        } catch {
            return url;
        }
    }
}

module.exports = { ReviewAnalyzer };