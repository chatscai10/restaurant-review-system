const http = require('http');

// 簡單的測試服務器，模擬 Railway Server 並提供 /api/config/stores
const server = http.createServer((req, res) => {
    if (req.url === '/api/config/stores') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            stores: [
                { id: 1, name: "Test Store", urls: {} }
            ]
        }));
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(3004, async () => {
    console.log('Stub server running on 3004');
    
    // 現在測試 Scheduler
    const { FixedCloudScheduler } = require('./cloud_automation_scheduler');
    
    // Mock config
    process.env.RAILWAY_URL = 'http://localhost:3004';
    process.env.TELEGRAM_BOT_TOKEN = 'fake-token'; // Prevent real send
    
    const scheduler = new FixedCloudScheduler();
    
    console.log('🧪 Testing getQueryConfig()...');
    const config = await scheduler.getQueryConfig();
    
    console.log('Result:', JSON.stringify(config, null, 2));
    
    if (config && config.length === 1 && config[0].name === 'Test Store') {
        console.log('✅ Config fetched successfully from API');
    } else {
        console.log('❌ Config fetch failed');
    }
    
    server.close();
    process.exit(0);
});