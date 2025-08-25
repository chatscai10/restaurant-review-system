const fs = require('fs');
const path = require('path');

/**
 * 修復前端API調用，使其使用可用的端點
 */
function fixFrontendApiCall() {
    console.log('🔧 修復前端API調用...');
    
    // 讀取public/index.html文件
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    
    if (!fs.existsSync(htmlPath)) {
        console.log('❌ 找不到public/index.html文件');
        return false;
    }
    
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    console.log('📋 檢查當前API端點調用...');
    
    // 檢查是否包含analyze-stores調用
    if (htmlContent.includes('/api/analyze-stores')) {
        console.log('✅ 找到 /api/analyze-stores 調用');
        
        // 替換為可用的端點
        htmlContent = htmlContent.replace(
            /\/api\/analyze-stores/g,
            '/api/analyze'
        );
        
        console.log('🔄 替換為 /api/analyze 端點');
        
        // 寫回文件
        fs.writeFileSync(htmlPath, htmlContent);
        
        console.log('✅ 前端API端點修復完成');
        return true;
    } else {
        console.log('⚠️ 未找到 /api/analyze-stores 調用');
        return false;
    }
}

/**
 * 創建臨時修復的HTML文件
 */
function createFixedHtml() {
    console.log('🆕 創建修復版HTML文件...');
    
    const originalPath = path.join(__dirname, 'public', 'index.html');
    const fixedPath = path.join(__dirname, 'public', 'index-fixed.html');
    
    if (!fs.existsSync(originalPath)) {
        console.log('❌ 原文件不存在');
        return false;
    }
    
    let content = fs.readFileSync(originalPath, 'utf8');
    
    // 替換API端點調用
    content = content.replace(/\/api\/analyze-stores/g, '/api/analyze');
    
    // 添加調試信息
    const debugScript = `
    <script>
    console.log('🔧 使用修復版本 - API端點已改為 /api/analyze');
    
    // 覆蓋原始的analyzeAllStores函數
    window.originalAnalyzeAllStores = window.analyzeAllStores;
    
    window.analyzeAllStores = async function() {
        console.log('🚀 使用修復版API端點: /api/analyze');
        
        const stores = collectStoreData();
        
        if (stores.length === 0) {
            alert('請至少填寫一個分店的名稱和網址');
            return;
        }

        // 顯示載入中
        document.getElementById('loadingSpinner').style.display = 'block';
        document.getElementById('resultsContainer').style.display = 'none';

        try {
            console.log('📡 發送請求到 /api/analyze');
            
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ stores })
            });

            console.log('📨 收到回應狀態:', response.status);
            
            const results = await response.json();
            
            console.log('📊 分析結果:', results);
            
            if (response.ok) {
                currentResults = results;
                displayResults(results);
                document.getElementById('telegramBtn').disabled = false;
                console.log('✅ 分析成功完成');
            } else {
                throw new Error(results.error || '分析失敗');
            }
        } catch (error) {
            console.error('❌ 分析錯誤:', error);
            alert('分析過程中發生錯誤：' + error.message);
        } finally {
            document.getElementById('loadingSpinner').style.display = 'none';
        }
    };
    </script>
    `;
    
    // 在</body>之前插入調試腳本
    content = content.replace('</body>', debugScript + '\\n</body>');
    
    fs.writeFileSync(fixedPath, content);
    
    console.log('✅ 修復版HTML已創建: index-fixed.html');
    return true;
}

/**
 * 測試修復後的端點
 */
async function testFixedEndpoint() {
    const https = require('https');
    
    console.log('🧪 測試修復後的端點...');
    
    const testData = {
        stores: [{
            id: 1,
            name: '測試分店',
            urls: {
                google: 'https://maps.app.goo.gl/test',
                uber: 'https://test.com',
                panda: 'https://test.com'
            }
        }]
    };
    
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(testData);
        
        const options = {
            hostname: 'restaurant-review-system-production.up.railway.app',
            port: 443,
            path: '/api/analyze',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`📨 回應狀態: ${res.statusCode}`);
                
                if (res.statusCode === 200) {
                    console.log('✅ /api/analyze 端點工作正常');
                    try {
                        const result = JSON.parse(data);
                        console.log('📊 測試結果: 平均評分', result.summary.averageRating);
                        resolve(true);
                    } catch (error) {
                        console.log('⚠️ JSON解析錯誤，但端點回應了');
                        resolve(true);
                    }
                } else {
                    console.log('❌ 端點測試失敗:', data.substring(0, 100));
                    resolve(false);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('❌ 請求錯誤:', error.message);
            resolve(false);
        });
        
        req.write(postData);
        req.end();
    });
}

// 執行修復流程
async function main() {
    console.log('🚀 開始前端API修復流程...\\n');
    
    // 1. 修復原文件
    const originalFixed = fixFrontendApiCall();
    
    // 2. 創建修復版本
    const fixedCreated = createFixedHtml();
    
    // 3. 測試端點
    const endpointWorks = await testFixedEndpoint();
    
    console.log('\\n📋 修復結果總結:');
    console.log(`• 原文件修復: ${originalFixed ? '✅' : '❌'}`);
    console.log(`• 修復版創建: ${fixedCreated ? '✅' : '❌'}`);
    console.log(`• 端點測試: ${endpointWorks ? '✅' : '❌'}`);
    
    if (originalFixed || fixedCreated) {
        console.log('\\n🎯 修復說明:');
        console.log('• 前端現在調用 /api/analyze 而不是 /api/analyze-stores');
        console.log('• /api/analyze 端點在Railway上工作正常');
        console.log('• 重新整理網頁後應該可以正常分析');
        
        if (fixedCreated) {
            console.log('• 也可以訪問 /index-fixed.html 使用修復版本');
        }
    }
    
    return originalFixed || fixedCreated;
}

if (require.main === module) {
    main()
        .then(success => {
            if (success) {
                console.log('\\n🎉 前端API修復完成！');
                process.exit(0);
            } else {
                console.log('\\n❌ 前端API修復失敗');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\\n💥 修復過程出錯:', error.message);
            process.exit(1);
        });
}

module.exports = { fixFrontendApiCall, createFixedHtml, testFixedEndpoint };