#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最終Python測試 - 完全隔離的WebDriver
"""

import time
import tempfile
import uuid
import os
import random
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
import shutil

def get_isolated_chrome_options():
    """獲取完全隔離的Chrome選項"""
    chrome_options = Options()
    
    # 基本設置
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    
    # 完全隔離設置
    temp_base = tempfile.gettempdir()
    session_id = f"{uuid.uuid4().hex[:12]}_{int(time.time())}"
    
    # 用戶數據目錄
    user_data_dir = os.path.join(temp_base, f"chrome_user_{session_id}")
    chrome_options.add_argument(f'--user-data-dir={user_data_dir}')
    
    # 磁盤緩存目錄
    disk_cache_dir = os.path.join(temp_base, f"chrome_cache_{session_id}")
    chrome_options.add_argument(f'--disk-cache-dir={disk_cache_dir}')
    
    # 隨機端口
    remote_debugging_port = random.randint(9222, 9999)
    chrome_options.add_argument(f'--remote-debugging-port={remote_debugging_port}')
    
    # 完全隔離
    chrome_options.add_argument('--disable-background-timer-throttling')
    chrome_options.add_argument('--disable-backgrounding-occluded-windows')
    chrome_options.add_argument('--disable-renderer-backgrounding')
    chrome_options.add_argument('--disable-features=TranslateUI')
    chrome_options.add_argument('--disable-extensions')
    chrome_options.add_argument('--disable-plugins')
    chrome_options.add_argument('--disable-images')
    chrome_options.add_argument('--disable-javascript')  # 暫時禁用JS測試基本連接
    
    # 反檢測
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    return chrome_options, user_data_dir, disk_cache_dir

def test_basic_connection():
    """測試基本連接能力"""
    print("🔧 Python WebDriver 基本連接測試")
    print("=" * 50)
    
    chrome_options, user_data_dir, disk_cache_dir = get_isolated_chrome_options()
    driver = None
    
    try:
        print("🚀 嘗試啟動完全隔離的Chrome WebDriver...")
        driver = webdriver.Chrome(options=chrome_options)
        driver.set_page_load_timeout(30)
        
        print("✅ WebDriver 啟動成功！")
        
        # 測試基本頁面載入
        print("📱 測試基本頁面載入...")
        driver.get("https://httpbin.org/html")
        time.sleep(3)
        
        title = driver.title
        print(f"📄 測試頁面標題: {title}")
        
        if title:
            print("✅ 基本頁面載入成功")
            
            # 現在測試實際網站 (重新啟用JS)
            print("\n🔄 重新配置WebDriver以支援JavaScript...")
            driver.quit()
            
            # 重新設置，這次啟用JS
            chrome_options, user_data_dir2, disk_cache_dir2 = get_isolated_chrome_options()
            chrome_options.remove_argument('--disable-javascript')  # 啟用JS
            
            driver = webdriver.Chrome(options=chrome_options)
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            driver.set_page_load_timeout(60)
            
            print("✅ JavaScript已啟用的WebDriver重新啟動成功")
            
            # 測試Google
            print("\n🔍 測試Google搜尋頁面...")
            driver.get("https://www.google.com")
            time.sleep(5)
            
            google_title = driver.title
            print(f"📄 Google頁面標題: {google_title}")
            
            if "Google" in google_title:
                print("✅ Google頁面載入成功")
                print("🎉 WebDriver基本功能正常，問題可能在於特定網站的載入時間或選擇器")
                
                # 簡單測試UberEats首頁
                print("\n🚗 快速測試UberEats首頁...")
                try:
                    driver.get("https://www.ubereats.com/tw")
                    time.sleep(10)
                    uber_title = driver.title
                    print(f"📄 UberEats首頁標題: {uber_title}")
                    
                    if uber_title:
                        print("✅ UberEats首頁可以載入")
                    else:
                        print("❌ UberEats首頁載入失敗")
                        
                except Exception as e:
                    print(f"❌ UberEats首頁測試失敗: {e}")
            else:
                print("❌ Google頁面載入失敗")
        else:
            print("❌ 基本頁面載入失敗")
            
    except Exception as e:
        print(f"❌ WebDriver 啟動失敗: {e}")
        print("💡 建議: 嘗試重啟電腦或使用不同的瀏覽器")
        
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass
        
        # 清理臨時目錄
        for temp_dir in [user_data_dir, disk_cache_dir]:
            try:
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir, ignore_errors=True)
            except:
                pass

if __name__ == "__main__":
    test_basic_connection()