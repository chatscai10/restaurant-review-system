const https = require('https');
const http = require('http');

/**
 * 真實數據爬蟲 - 不依賴Puppeteer
 * 使用HTTP請求和正則表達式提取真實數據
 */
class RealDataCrawler {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        this.timeout = 15000;
    }

    /**
     * 分析Google Maps真實數據
     */
    async scrapeGoogleMapsReal(url) {
        try {
            console.log('🗺️ 抓取Google Maps真實數據...');
            
            // 嘗試從URL提取座標
            const coords = this.extractCoordinates(url);
            if (!coords) {
                throw new Error('無法從Google Maps URL提取座標');
            }

            // 使用Google Places API (如果有API key) 或退回到HTML解析
            const html = await this.fetchPageContent(url);
            
            return this.parseGoogleMapsData(html, url);
            
        } catch (error) {
            console.error('Google Maps抓取失敗:', error.message);
            throw error;
        }
    }

    /**
     * 分析UberEats真實數據
     */
    async scrapeUberEatsReal(url) {
        try {
            console.log('🚗 抓取UberEats真實數據...');
            
            const html = await this.fetchPageContent(url);
            return this.parseUberEatsData(html, url);
            
        } catch (error) {
            console.error('UberEats抓取失敗:', error.message);
            throw error;
        }
    }

    /**
     * 分析Foodpanda真實數據
     */
    async scrapeFoodpandaReal(url) {
        try {
            console.log('🐼 抓取Foodpanda真實數據...');
            
            const html = await this.fetchPageContent(url);
            return this.parseFoodpandaData(html, url);
            
        } catch (error) {
            console.error('Foodpanda抓取失敗:', error.message);
            throw error;
        }
    }

    /**
     * 獲取網頁內容
     */
    async fetchPageContent(url) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https://') ? https : http;
            
            const options = {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'max-age=0'
                },
                timeout: this.timeout
            };

            const req = protocol.get(url, options, (res) => {
                let data = '';
                
                // 處理重定向
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    console.log(`重定向到: ${res.headers.location}`);
                    return this.fetchPageContent(res.headers.location).then(resolve).catch(reject);
                }

                res.setEncoding('utf8');
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    /**
     * 解析Google Maps數據
     */
    parseGoogleMapsData(html, url) {
        try {
            const data = {
                name: this.extractGoogleName(html),
                rating: this.extractGoogleRating(html),
                reviewCount: this.extractGoogleReviews(html),
                address: this.extractGoogleAddress(html),
                phone: this.extractGooglePhone(html),
                openingHours: this.extractGoogleHours(html),
                priceLevel: this.extractGooglePrice(html)
            };

            console.log('✅ Google Maps數據解析完成:', data.name);
            return data;
            
        } catch (error) {
            console.error('Google Maps數據解析失敗:', error.message);
            // 返回基本數據而不是完全失敗
            return {
                name: '餐廳 (Google Maps)',
                rating: null,
                reviewCount: null,
                address: null,
                phone: null,
                openingHours: null,
                priceLevel: null,
                note: '部分數據無法獲取，請稍後重試'
            };
        }
    }

    /**
     * 解析UberEats數據
     */
    parseUberEatsData(html, url) {
        try {
            const data = {
                name: this.extractUberName(html),
                rating: this.extractUberRating(html),
                reviewCount: this.extractUberReviews(html),
                deliveryTime: this.extractUberDeliveryTime(html),
                deliveryFee: this.extractUberDeliveryFee(html),
                priceLevel: this.extractUberPrice(html),
                category: this.extractUberCategory(html)
            };

            console.log('✅ UberEats數據解析完成:', data.name);
            return data;
            
        } catch (error) {
            console.error('UberEats數據解析失敗:', error.message);
            return {
                name: '餐廳 (UberEats)',
                rating: null,
                reviewCount: null,
                deliveryTime: null,
                deliveryFee: null,
                priceLevel: null,
                category: null,
                note: '部分數據無法獲取，請稍後重試'
            };
        }
    }

    /**
     * 解析Foodpanda數據
     */
    parseFoodpandaData(html, url) {
        try {
            const data = {
                name: this.extractPandaName(html),
                rating: this.extractPandaRating(html),
                reviewCount: this.extractPandaReviews(html),
                deliveryTime: this.extractPandaDeliveryTime(html),
                deliveryFee: this.extractPandaDeliveryFee(html),
                priceLevel: this.extractPandaPrice(html),
                category: this.extractPandaCategory(html)
            };

            console.log('✅ Foodpanda數據解析完成:', data.name);
            return data;
            
        } catch (error) {
            console.error('Foodpanda數據解析失敗:', error.message);
            return {
                name: '餐廳 (Foodpanda)',
                rating: null,
                reviewCount: null,
                deliveryTime: null,
                deliveryFee: null,
                priceLevel: null,
                category: null,
                note: '部分數據無法獲取，請稍後重試'
            };
        }
    }

    // Google Maps數據提取方法
    extractGoogleName(html) {
        const patterns = [
            /"([^"]+)"\s*,\s*\d+\.\d+\s*stars/i,
            /data-value="title"[^>]*>([^<]+)</i,
            /<h1[^>]*>([^<]+)<\/h1>/i,
            /title="([^"]+)"/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1] && match[1].trim().length > 2) {
                return match[1].trim();
            }
        }
        return '未知餐廳';
    }

    extractGoogleRating(html) {
        const patterns = [
            /(\d+\.?\d*)\s*stars/i,
            /rating[":]\s*(\d+\.?\d*)/i,
            /(\d+\.?\d*)\s*star/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                const rating = parseFloat(match[1]);
                if (rating >= 1 && rating <= 5) {
                    return rating;
                }
            }
        }
        return null;
    }

    extractGoogleReviews(html) {
        const patterns = [
            /(\d+(?:,\d+)*)\s*reviews?/i,
            /(\d+(?:,\d+)*)\s*則評論/i,
            /(\d+(?:,\d+)*)\s*個評論/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                return match[1].replace(/,/g, '');
            }
        }
        return null;
    }

    extractGoogleAddress(html) {
        const patterns = [
            /address[":]\s*"([^"]+)"/i,
            /地址[":：]\s*([^\n\r<]+)/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return null;
    }

    extractGooglePhone(html) {
        const patterns = [
            /phone[":]\s*"([^"]+)"/i,
            /電話[":：]\s*([^\n\r<]+)/i,
            /(\d{2,3}-?\d{3,4}-?\d{3,4})/
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return null;
    }

    extractGoogleHours(html) {
        const patterns = [
            /營業時間[":：]\s*([^\n\r<]+)/i,
            /hours[":]\s*"([^"]+)"/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return null;
    }

    extractGooglePrice(html) {
        if (html.includes('$$$$')) return '$$$$';
        if (html.includes('$$$')) return '$$$';
        if (html.includes('$$')) return '$$';
        if (html.includes('$')) return '$';
        return null;
    }

    // UberEats數據提取方法
    extractUberName(html) {
        const patterns = [
            /<h1[^>]*>([^<]+)<\/h1>/i,
            /store.*name[":]\s*"([^"]+)"/i,
            /title[":]\s*"([^"]+)"/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1] && match[1].trim().length > 2) {
                return match[1].trim();
            }
        }
        return '未知餐廳';
    }

    extractUberRating(html) {
        const patterns = [
            /rating[":]\s*(\d+\.?\d*)/i,
            /(\d+\.?\d*)\s*\/\s*5/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                const rating = parseFloat(match[1]);
                if (rating >= 1 && rating <= 5) {
                    return rating;
                }
            }
        }
        return null;
    }

    extractUberReviews(html) {
        const patterns = [
            /(\d+(?:,\d+)*)\s*reviews?/i,
            /(\d+(?:,\d+)*)\s*則評論/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                return match[1].replace(/,/g, '');
            }
        }
        return null;
    }

    extractUberDeliveryTime(html) {
        const patterns = [
            /(\d+)-(\d+)\s*分鐘/i,
            /(\d+)-(\d+)\s*mins?/i,
            /delivery.*time[":]\s*"([^"]+)"/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                if (match[2]) {
                    return `${match[1]}-${match[2]}分鐘`;
                } else if (match[1]) {
                    return match[1];
                }
            }
        }
        return null;
    }

    extractUberDeliveryFee(html) {
        const patterns = [
            /delivery.*fee[":]\s*"?([^"\s]+)"?/i,
            /外送費[":：]\s*([^\n\r<]+)/i,
            /\$(\d+(?:\.\d+)?)/
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return null;
    }

    extractUberPrice(html) {
        if (html.includes('$$$$')) return '$$$$';
        if (html.includes('$$$')) return '$$$';
        if (html.includes('$$')) return '$$';
        if (html.includes('$')) return '$';
        return '$$';
    }

    extractUberCategory(html) {
        const patterns = [
            /category[":]\s*"([^"]+)"/i,
            /cuisine[":]\s*"([^"]+)"/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return '餐廳';
    }

    // Foodpanda數據提取方法（類似UberEats）
    extractPandaName(html) {
        return this.extractUberName(html).replace('未知餐廳', 'Foodpanda餐廳');
    }

    extractPandaRating(html) {
        return this.extractUberRating(html);
    }

    extractPandaReviews(html) {
        return this.extractUberReviews(html);
    }

    extractPandaDeliveryTime(html) {
        return this.extractUberDeliveryTime(html);
    }

    extractPandaDeliveryFee(html) {
        return this.extractUberDeliveryFee(html);
    }

    extractPandaPrice(html) {
        return this.extractUberPrice(html);
    }

    extractPandaCategory(html) {
        return this.extractUberCategory(html);
    }

    /**
     * 從Google Maps URL提取座標
     */
    extractCoordinates(url) {
        const patterns = [
            /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
            /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1] && match[2]) {
                return {
                    lat: parseFloat(match[1]),
                    lng: parseFloat(match[2])
                };
            }
        }
        return null;
    }
}

module.exports = { RealDataCrawler };