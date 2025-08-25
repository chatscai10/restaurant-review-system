/**
 * 調試Foodpanda短連結重定向問題
 */

const puppeteer = require('puppeteer');

async function debugFoodpandaRedirect() {
    const shortUrl = 'https://foodpanda.page.link/yhvLQKDDAScTN5rq7';
    
    console.log('🐼 調試Foodpanda短連結重定向...');
    console.log('🔗 原始短連結:', shortUrl);
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false, // 顯示瀏覽器以便觀察
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('🚀 正在訪問短連結...');
        
        // 監聽頁面導航
        page.on('response', response => {
            console.log(`📍 HTTP ${response.status()}: ${response.url()}`);
        });
        
        await page.goto(shortUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 15000 
        });
        
        // 等待頁面完全載入
        await page.waitForTimeout(3000);
        
        const finalUrl = page.url();
        console.log('🎯 最終重定向URL:', finalUrl);
        
        // 嘗試提取店家資訊
        const storeInfo = await page.evaluate(() => {
            // 搜尋各種可能的店家名稱選擇器
            const nameSelectors = [
                'h1[data-testid="restaurant-name"]',
                'h1.restaurant-name',
                '.restaurant-header h1',
                '.vendor-name',
                '.restaurant-title',
                'h1',
                '[data-testid*="name"]',
                '.vendor-info h1'
            ];
            
            let storeName = null;
            for (const selector of nameSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    storeName = element.textContent.trim();
                    console.log(`找到店名選擇器: ${selector} -> ${storeName}`);
                    break;
                }
            }
            
            // 搜尋評分
            const ratingSelectors = [
                '[data-testid="rating-stars"]',
                '.rating-stars',
                '.vendor-rating',
                '.rating',
                '[class*="rating"]'
            ];
            
            let rating = null;
            for (const selector of ratingSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent || element.getAttribute('aria-label') || '';
                    const ratingMatch = text.match(/(\d+\.?\d*)/);
                    if (ratingMatch) {
                        rating = ratingMatch[1];
                        console.log(`找到評分選擇器: ${selector} -> ${rating}`);
                        break;
                    }
                }
            }
            
            return {
                url: window.location.href,
                title: document.title,
                storeName,
                rating,
                html: document.documentElement.innerHTML.substring(0, 1000) // 前1000字符用於調試
            };
        });
        
        console.log('\n📋 提取到的資訊:');
        console.log('  網址:', storeInfo.url);
        console.log('  標題:', storeInfo.title);
        console.log('  店名:', storeInfo.storeName || '未找到');
        console.log('  評分:', storeInfo.rating || '未找到');
        
        // 檢查是否為正確的店家
        if (storeInfo.storeName && storeInfo.storeName.includes('龍崗')) {
            console.log('✅ 找到正確的龍崗店家！');
        } else {
            console.log('⚠️ 店家名稱與預期不符，可能重定向到了錯誤的店家');
        }
        
        return storeInfo;
        
    } catch (error) {
        console.error('❌ 調試過程發生錯誤:', error.message);
        return null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 執行調試
debugFoodpandaRedirect()
    .then(result => {
        if (result) {
            console.log('\n🎯 調試完成！');
        } else {
            console.log('\n❌ 調試失敗');
        }
        process.exit(0);
    })
    .catch(error => {
        console.error('調試執行失敗:', error);
        process.exit(1);
    });