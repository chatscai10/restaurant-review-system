const { PuppeteerCrawler } = require('./utils/puppeteerCrawler');

async function verifyNewCrawler() {
    const crawler = new PuppeteerCrawler();
    // Test with one store URL (e.g., UberEats which is easier to scrape without login usually)
    const url = 'https://www.ubereats.com/tw/store/%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E4%B8%AD%E5%A3%A2%E9%BE%8D%E5%B4%97%E5%BA%97/3L1jndcDXGClXn3bGmlU-Q';
    
    console.log('🕷️ Testing PuppeteerCrawler on UberEats...');
    try {
        const result = await crawler.scrapeUrl('uber', url);
        console.log('Result:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('✅ Crawler verification PASSED');
        } else {
            console.log('❌ Crawler verification FAILED');
        }
    } catch (e) {
        console.error('❌ Critical Error:', e);
    }
}

verifyNewCrawler();