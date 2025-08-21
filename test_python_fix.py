#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
測試Python獨立版修復
簡單測試UberEats和Foodpanda爬取
"""

import time
import tempfile
import uuid
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import re

def test_scraping():
    """測試爬取功能"""
    
    # 測試網址
    uber_url = 'https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9?diningMode=DELIVERY'
    panda_url = 'https://foodpanda.page.link/yhvLQKDDAScTN5rq7'
    
    print("🧪 Python爬取修復測試")
    print("=" * 50)
    
    # 設置WebDriver
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    
    # 使用隨機臨時目錄避免衝突
    temp_dir = tempfile.mkdtemp(prefix=f"chrome_test_{uuid.uuid4().hex[:8]}_")
    chrome_options.add_argument(f'--user-data-dir={temp_dir}')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    try:
        print("🚀 啟動WebDriver...")
        driver = webdriver.Chrome(options=chrome_options)
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        driver.set_page_load_timeout(60)
        
        print("✅ WebDriver啟動成功！")
        
        # 測試UberEats
        print(f"\n🚗 測試UberEats...")
        driver.get(uber_url)
        time.sleep(15)
        
        # 檢查頁面內容
        title = driver.title
        print(f"📄 UberEats頁面標題: {title}")
        
        # 尋找店名
        try:
            h1_elements = driver.find_elements(By.TAG_NAME, 'h1')
            for h1 in h1_elements[:3]:  # 只檢查前3個
                text = h1.text.strip()
                if text and '雞排' in text:
                    print(f"✅ 找到UberEats店名: {text}")
                    break
        except Exception as e:
            print(f"❌ UberEats店名搜尋失敗: {e}")
        
        # 測試Foodpanda
        print(f"\n🐼 測試Foodpanda...")
        driver.get(panda_url)
        time.sleep(20)
        
        # 檢查頁面內容
        title = driver.title
        print(f"📄 Foodpanda頁面標題: {title}")
        
        # 尋找店名
        try:
            h1_elements = driver.find_elements(By.TAG_NAME, 'h1')
            for h1 in h1_elements[:3]:  # 只檢查前3個
                text = h1.text.strip()
                if text and '雞排' in text:
                    print(f"✅ 找到Foodpanda店名: {text}")
                    break
        except Exception as e:
            print(f"❌ Foodpanda店名搜尋失敗: {e}")
        
        print("\n🎉 測試完成")
        
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        
    finally:
        try:
            driver.quit()
        except:
            pass
        
        # 清理臨時目錄
        import shutil
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except:
            pass

if __name__ == "__main__":
    test_scraping()