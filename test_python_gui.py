#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Python GUI 工具完整驗證測試
測試所有核心功能模組
"""

import requests
import json
import os
import sys
from datetime import datetime

class PythonGUITester:
    def __init__(self):
        self.server_url = "http://localhost:3003"
        self.memory_file = "restaurant_memory.json"
        self.test_results = []
        
    def log_test(self, test_name, success, message=""):
        """記錄測試結果"""
        status = "✅" if success else "❌"
        timestamp = datetime.now().strftime('%H:%M:%S')
        result = f"[{timestamp}] {status} {test_name}"
        if message:
            result += f" - {message}"
        print(result)
        self.test_results.append({
            'name': test_name,
            'success': success,
            'message': message,
            'timestamp': timestamp
        })
    
    def test_server_connection(self):
        """測試服務器連接"""
        print("🔌 測試服務器連接...")
        try:
            response = requests.get(f"{self.server_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log_test("服務器連接", True, f"狀態: {data.get('status', 'OK')}")
                return True
            else:
                self.log_test("服務器連接", False, f"HTTP {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.log_test("服務器連接", False, f"連接失敗: {str(e)}")
            return False
    
    def test_memory_functions(self):
        """測試記憶功能"""
        print("\n💾 測試記憶功能...")
        
        # 測試保存記憶
        test_data = {
            "store_name": "測試分店",
            "google_url": "https://maps.google.com/test",
            "uber_url": "https://www.ubereats.com/test",
            "panda_url": "https://www.foodpanda.com/test",
            "saved_time": datetime.now().isoformat()
        }
        
        try:
            # 保存測試
            with open(self.memory_file, 'w', encoding='utf-8') as f:
                json.dump(test_data, f, ensure_ascii=False, indent=2)
            self.log_test("記憶保存", True, "測試數據已保存")
            
            # 載入測試
            if os.path.exists(self.memory_file):
                with open(self.memory_file, 'r', encoding='utf-8') as f:
                    loaded_data = json.load(f)
                
                if loaded_data.get("store_name") == test_data["store_name"]:
                    self.log_test("記憶載入", True, "數據載入正確")
                else:
                    self.log_test("記憶載入", False, "數據不匹配")
            else:
                self.log_test("記憶載入", False, "記憶文件不存在")
                
            # 清理測試文件
            if os.path.exists(self.memory_file):
                os.remove(self.memory_file)
                self.log_test("記憶清理", True, "測試文件已刪除")
                
        except Exception as e:
            self.log_test("記憶功能", False, f"錯誤: {str(e)}")
    
    def test_analysis_api(self):
        """測試分析API"""
        print("\n📊 測試分析API...")
        
        # 使用真實的測試數據
        test_data = {
            "stores": [{
                "id": 1,
                "name": "不早脆皮雞排 中壢龍崗店",
                "urls": {
                    "google": "https://maps.app.goo.gl/fS8RAzxJpBjVpSQT9?g_st=com.google.maps.preview.copy",
                    "uber": "https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9?diningMode=DELIVERY"
                }
            }]
        }
        
        try:
            print("   ⏳ 正在發送分析請求...")
            response = requests.post(f"{self.server_url}/api/analyze-stores", 
                                   json=test_data, timeout=45)
            
            if response.status_code == 200:
                results = response.json()
                stores = results.get('stores', [])
                if stores and len(stores) > 0:
                    store = stores[0]
                    platforms = store.get('platforms', {})
                    
                    # 檢查 Google Maps 結果
                    if platforms.get('google', {}).get('success'):
                        self.log_test("Google Maps分析", True, 
                                    f"評分: {platforms['google'].get('rating', 'N/A')}")
                    else:
                        self.log_test("Google Maps分析", False, 
                                    platforms.get('google', {}).get('error', '未知錯誤'))
                    
                    # 檢查 UberEats 結果
                    if platforms.get('uber', {}).get('success'):
                        self.log_test("UberEats分析", True, 
                                    f"評分: {platforms['uber'].get('rating', 'N/A')}")
                    else:
                        self.log_test("UberEats分析", False, 
                                    platforms.get('uber', {}).get('error', '未知錯誤'))
                    
                    self.log_test("分析API", True, f"成功分析 {len(platforms)} 個平台")
                    return results
                else:
                    self.log_test("分析API", False, "無分析結果")
                    return None
            else:
                self.log_test("分析API", False, f"HTTP {response.status_code}")
                return None
                
        except requests.exceptions.Timeout:
            self.log_test("分析API", False, "請求超時")
            return None
        except Exception as e:
            self.log_test("分析API", False, f"錯誤: {str(e)}")
            return None
    
    def test_telegram_notification(self, analysis_results):
        """測試Telegram通知"""
        print("\n✈️ 測試Telegram通知...")
        
        if not analysis_results:
            self.log_test("Telegram通知", False, "無分析結果可發送")
            return
        
        try:
            response = requests.post(f"{self.server_url}/api/send-telegram-notification", 
                                   json=analysis_results, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    self.log_test("Telegram通知", True, "通知發送成功")
                else:
                    self.log_test("Telegram通知", False, result.get('error', '未知錯誤'))
            else:
                self.log_test("Telegram通知", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Telegram通知", False, f"錯誤: {str(e)}")
    
    def test_gui_dependencies(self):
        """測試GUI依賴"""
        print("\n🐍 測試Python依賴...")
        
        # 測試 tkinter
        try:
            import tkinter as tk
            self.log_test("tkinter模組", True, "GUI框架可用")
        except ImportError:
            self.log_test("tkinter模組", False, "需要安裝python3-tk")
        
        # 測試 requests
        try:
            import requests
            self.log_test("requests模組", True, f"版本: {requests.__version__}")
        except ImportError:
            self.log_test("requests模組", False, "需要: pip install requests")
        
        # 測試 json (內建)
        try:
            import json
            self.log_test("json模組", True, "內建模組可用")
        except ImportError:
            self.log_test("json模組", False, "內建模組缺失")
        
        # 測試 threading (內建)
        try:
            import threading
            self.log_test("threading模組", True, "多線程支援可用")
        except ImportError:
            self.log_test("threading模組", False, "多線程支援缺失")
    
    def test_file_permissions(self):
        """測試文件權限"""
        print("\n📁 測試文件權限...")
        
        try:
            # 測試寫入權限
            test_file = "permission_test.tmp"
            with open(test_file, 'w') as f:
                f.write("test")
            self.log_test("寫入權限", True, "可以創建文件")
            
            # 測試讀取權限
            with open(test_file, 'r') as f:
                content = f.read()
            self.log_test("讀取權限", True, "可以讀取文件")
            
            # 清理測試文件
            os.remove(test_file)
            self.log_test("刪除權限", True, "可以刪除文件")
            
        except Exception as e:
            self.log_test("文件權限", False, f"權限錯誤: {str(e)}")
    
    def run_comprehensive_test(self):
        """執行完整測試"""
        print("🧪 Python GUI 工具完整驗證測試")
        print("=" * 60)
        
        # 依賴檢查
        self.test_gui_dependencies()
        
        # 文件權限檢查
        self.test_file_permissions()
        
        # 服務器連接檢查
        server_ok = self.test_server_connection()
        
        if server_ok:
            # 記憶功能測試
            self.test_memory_functions()
            
            # API功能測試
            analysis_results = self.test_analysis_api()
            
            # Telegram通知測試
            if analysis_results:
                self.test_telegram_notification(analysis_results)
        else:
            print("\n⚠️ 服務器離線，跳過API相關測試")
        
        # 生成測試報告
        self.generate_test_report()
    
    def generate_test_report(self):
        """生成測試報告"""
        print("\n" + "=" * 60)
        print("📋 Python GUI 工具驗證報告")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"📊 測試統計:")
        print(f"   總測試數: {total_tests}")
        print(f"   ✅ 通過: {passed_tests}")
        print(f"   ❌ 失敗: {failed_tests}")
        print(f"   📈 成功率: {(passed_tests/total_tests*100):.1f}%")
        
        print(f"\n📝 詳細結果:")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"   {status} {result['name']}")
            if result['message']:
                print(f"      {result['message']}")
        
        print(f"\n🎯 系統狀態評估:")
        if failed_tests == 0:
            print("   🟢 完全正常 - Python GUI 工具完全可用")
        elif failed_tests <= 2:
            print("   🟡 基本正常 - 有少數問題但基本功能可用")
        else:
            print("   🔴 需要修復 - 發現多個問題需要解決")
        
        print(f"\n🚀 使用建議:")
        if passed_tests >= total_tests * 0.8:
            print("   ✅ Python GUI 工具已準備就緒")
            print("   💡 執行命令: python restaurant_review_analyzer_gui.py")
            print("   🌐 或使用網頁版: http://localhost:3003")
        else:
            print("   ⚠️ 建議先修復失敗的測試項目")
            print("   📖 查看 PYTHON_GUI_README.md 獲取故障排除幫助")
        
        print("=" * 60)

def main():
    """主函數"""
    print("🔍 開始 Python GUI 工具完整驗證...")
    
    tester = PythonGUITester()
    tester.run_comprehensive_test()
    
    print(f"\n⏰ 測試完成時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()