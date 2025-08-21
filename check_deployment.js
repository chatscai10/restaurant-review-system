const https = require('https');
const fs = require('fs');

class DeploymentChecker {
    constructor() {
        this.deploymentUrls = [
            'https://restaurant-review-system.vercel.app',
            'https://restaurant-review-system-chatscai10.vercel.app',
            'https://restaurant-review-system-git-master-chatscai10.vercel.app'
        ];
    }

    async checkUrl(url) {
        return new Promise((resolve) => {
            const request = https.get(url, { timeout: 10000 }, (response) => {
                const { statusCode } = response;
                const success = statusCode >= 200 && statusCode < 400;
                
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    resolve({
                        url,
                        success,
                        statusCode,
                        hasContent: data.length > 0,
                        contentLength: data.length
                    });
                });
            });

            request.on('error', (error) => {
                resolve({
                    url,
                    success: false,
                    error: error.message
                });
            });

            request.on('timeout', () => {
                request.destroy();
                resolve({
                    url,
                    success: false,
                    error: 'Request timeout'
                });
            });
        });
    }

    async checkAllUrls() {
        console.log('🔍 檢查雲端部署狀態...\n');
        
        const results = [];
        for (const url of this.deploymentUrls) {
            console.log(`📡 檢查: ${url}`);
            const result = await this.checkUrl(url);
            results.push(result);
            
            if (result.success) {
                console.log(`✅ 成功 (${result.statusCode}) - 內容長度: ${result.contentLength} bytes`);
            } else {
                console.log(`❌ 失敗 - ${result.error || result.statusCode}`);
            }
            console.log('');
        }

        return results;
    }

    async checkSpecificEndpoints(baseUrl) {
        const endpoints = [
            '/',
            '/admin',
            '/api/health',
            '/api/stores',
            '/api/telegram-groups'
        ];

        console.log(`\n🔧 檢查 ${baseUrl} 的功能端點:\n`);
        
        for (const endpoint of endpoints) {
            const url = baseUrl + endpoint;
            console.log(`📋 檢查: ${endpoint}`);
            const result = await this.checkUrl(url);
            
            if (result.success) {
                console.log(`✅ ${endpoint} - 正常 (${result.statusCode})`);
            } else {
                console.log(`❌ ${endpoint} - ${result.error || result.statusCode}`);
            }
        }
    }

    generateReport(results) {
        const report = {
            timestamp: new Date().toISOString(),
            totalChecked: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results: results
        };

        const reportContent = `# 🚀 部署狀態檢查報告

**檢查時間**: ${report.timestamp}
**總檢查數**: ${report.totalChecked}
**成功**: ${report.successful}
**失敗**: ${report.failed}

## 詳細結果

${results.map(result => `
### ${result.url}
- 狀態: ${result.success ? '✅ 成功' : '❌ 失敗'}
- HTTP狀態碼: ${result.statusCode || 'N/A'}
- 內容長度: ${result.contentLength || 0} bytes
- 錯誤: ${result.error || '無'}
`).join('\n')}

## 📋 下一步操作

${report.successful > 0 ? 
'✅ 找到可用的部署網址，請前往測試功能' : 
'❌ 尚未找到可用部署，請檢查Vercel部署狀態'}

---
自動生成於: ${new Date().toLocaleString('zh-TW')}
`;

        fs.writeFileSync('deployment_check_report.md', reportContent);
        console.log('\n📄 檢查報告已保存到: deployment_check_report.md');
        
        return report;
    }
}

async function main() {
    const checker = new DeploymentChecker();
    
    try {
        const results = await checker.checkAllUrls();
        const report = checker.generateReport(results);
        
        // 如果找到可用的部署，進行深度檢查
        const workingUrl = results.find(r => r.success);
        if (workingUrl) {
            console.log(`\n🎉 發現可用部署: ${workingUrl.url}`);
            await checker.checkSpecificEndpoints(workingUrl.url);
        } else {
            console.log('\n⚠️ 尚未找到可用的部署網址');
            console.log('📋 請手動完成Vercel部署後再次執行此腳本');
        }
        
    } catch (error) {
        console.error('❌ 檢查過程發生錯誤:', error.message);
    }
}

// 如果直接執行此檔案
if (require.main === module) {
    main();
}

module.exports = DeploymentChecker;