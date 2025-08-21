/**
 * 管理後台系統測試腳本
 * 測試所有API端點和功能
 */

const http = require('http');

const BASE_URL = 'http://localhost:3003';

// HTTP 請求函數
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const data = options.data ? JSON.stringify(options.data) : null;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        if (data) {
            requestOptions.headers['Content-Length'] = Buffer.byteLength(data);
        }
        
        const req = http.request(requestOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: body ? JSON.parse(body) : {}
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        data: body
                    });
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(data);
        }
        
        req.end();
    });
}

class AdminSystemTester {
    constructor() {
        this.testResults = [];
    }
    
    async runAllTests() {
        console.log('🧪 開始管理後台系統測試');
        console.log('=' * 60);
        
        try {
            // 測試基本API
            await this.testBasicAPIs();
            
            // 測試分店管理
            await this.testStoreManagement();
            
            // 測試群組管理
            await this.testGroupManagement();
            
            // 測試排程功能
            await this.testScheduleManagement();
            
            // 生成測試報告
            this.generateTestReport();
            
        } catch (error) {
            console.error('💥 測試過程中發生錯誤:', error);
        }
    }
    
    async testBasicAPIs() {
        console.log('\n📋 測試基本API端點...');
        
        // 測試管理後台頁面
        const adminPageResult = await this.testEndpoint('GET', '/admin', null, '管理後台頁面');
        
        // 測試API端點
        await this.testEndpoint('GET', '/api/admin/stores', null, '載入分店配置');
        await this.testEndpoint('GET', '/api/admin/groups', null, '載入群組配置');
        await this.testEndpoint('GET', '/api/admin/telegram-config', null, '載入Telegram配置');
        await this.testEndpoint('GET', '/api/admin/execution-logs', null, '載入執行記錄');
    }
    
    async testStoreManagement() {
        console.log('\n🏪 測試分店管理功能...');
        
        // 測試分店數據
        const testStore = {
            id: 'test_store_1',
            name: '測試分店',
            urls: {
                google: 'https://maps.app.goo.gl/fS8RAzxJpBjVpSQT9',
                uber: 'https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9',
                panda: 'https://foodpanda.page.link/yhvLQKDDAScTN5rq7'
            },
            enabled: true
        };
        
        // 儲存分店配置
        await this.testEndpoint('POST', '/api/admin/stores', [testStore], '儲存分店配置');
        
        // 驗證儲存結果
        const storesResult = await this.testEndpoint('GET', '/api/admin/stores', null, '驗證分店配置');
        
        if (storesResult && storesResult.data && storesResult.data.length > 0) {
            console.log('  ✅ 分店配置儲存成功');
        } else {
            console.log('  ❌ 分店配置儲存失敗');
        }
    }
    
    async testGroupManagement() {
        console.log('\n👥 測試群組管理功能...');
        
        // 測試群組數據
        const testGroups = [
            {
                id: 'test_group_1',
                name: '測試群組1',
                chatId: '-1002658082392',
                enabled: true
            },
            {
                id: 'test_group_2',
                name: '測試群組2',
                chatId: '-1234567890',
                enabled: false
            }
        ];
        
        // 儲存群組配置
        await this.testEndpoint('POST', '/api/admin/groups', testGroups, '儲存群組配置');
        
        // 驗證儲存結果
        const groupsResult = await this.testEndpoint('GET', '/api/admin/groups', null, '驗證群組配置');
        
        if (groupsResult && groupsResult.data && groupsResult.data.length > 0) {
            console.log('  ✅ 群組配置儲存成功');
        } else {
            console.log('  ❌ 群組配置儲存失敗');
        }
        
        // 測試群組連接
        await this.testEndpoint('POST', '/api/test-telegram-group', {
            chatId: '-1002658082392',
            groupName: '測試群組1'
        }, '測試Telegram群組連接');
    }
    
    async testScheduleManagement() {
        console.log('\n⏰ 測試排程管理功能...');
        
        // 測試排程配置
        const testSchedule = {
            time: '02:00',
            frequency: 'daily',
            enabled: true
        };
        
        // 儲存排程配置
        await this.testEndpoint('POST', '/api/admin/schedule', testSchedule, '儲存排程配置');
        
        // 驗證排程配置
        await this.testEndpoint('GET', '/api/admin/schedule', null, '驗證排程配置');
        
        // 測試排程執行（如果有分店配置）
        console.log('  🧪 測試排程執行...');
        try {
            const testResult = await this.testEndpoint('POST', '/api/admin/test-schedule', null, '測試排程執行');
            if (testResult && testResult.status === 200) {
                console.log('  ✅ 排程測試執行成功');
            } else {
                console.log('  ⚠️ 排程測試可能需要更多配置');
            }
        } catch (error) {
            console.log('  ⚠️ 排程測試跳過（正常，需要完整配置）');
        }
    }
    
    async testEndpoint(method, path, data, description) {
        try {
            const url = `${BASE_URL}${path}`;
            const result = await makeRequest(url, { method, data });
            
            const statusIcon = result.status >= 200 && result.status < 300 ? '✅' : '❌';
            console.log(`  ${statusIcon} ${description}: ${result.status}`);
            
            this.testResults.push({
                description,
                method,
                path,
                status: result.status,
                success: result.status >= 200 && result.status < 300
            });
            
            return result;
            
        } catch (error) {
            console.log(`  ❌ ${description}: 錯誤 - ${error.message}`);
            this.testResults.push({
                description,
                method,
                path,
                status: 'ERROR',
                success: false,
                error: error.message
            });
        }
    }
    
    generateTestReport() {
        console.log('\n📊 測試結果報告');
        console.log('=' * 60);
        
        const totalTests = this.testResults.length;
        const successTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - successTests;
        
        console.log(`📈 總測試數: ${totalTests}`);
        console.log(`✅ 成功: ${successTests}`);
        console.log(`❌ 失敗: ${failedTests}`);
        console.log(`📊 成功率: ${Math.round((successTests / totalTests) * 100)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ 失敗的測試:');
            this.testResults.filter(r => !r.success).forEach(test => {
                console.log(`   • ${test.description}: ${test.status} ${test.error || ''}`);
            });
        }
        
        console.log('\n🎯 系統狀態評估:');
        if (successTests >= totalTests * 0.8) {
            console.log('🟢 系統運行良好，可以正常使用');
        } else if (successTests >= totalTests * 0.6) {
            console.log('🟡 系統基本正常，建議檢查失敗的功能');
        } else {
            console.log('🔴 系統存在問題，需要檢查配置和依賴');
        }
        
        console.log('\n📱 下一步操作:');
        console.log('1. 打開瀏覽器訪問: http://localhost:3003/admin');
        console.log('2. 在管理後台中配置分店和群組');
        console.log('3. 測試完整的查詢和通知功能');
        console.log('4. 設定GitHub Actions自動化');
        
        console.log('\n🎉 管理後台系統測試完成！');
    }
}

// 執行測試
async function main() {
    const tester = new AdminSystemTester();
    await tester.runAllTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { AdminSystemTester };