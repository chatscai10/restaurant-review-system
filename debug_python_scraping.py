#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Python 爬取診斷工具
用於診斷 UberEats 和 Foodpanda 爬取問題
"""

import time
import tempfile
import uuid
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import re

class ScrapingDiagnostic:
    def __init__(self):
        self.driver = None
        
    def setup_driver(self, headless=False):
        """設置 Chrome WebDriver"""
        try:
            chrome_options = Options()
            if headless:
                chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1920,1080')
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            
            # 修復WebDriver衝突問題
            import tempfile
            import uuid
            temp_dir = tempfile.gettempdir()
            unique_dir = tempfile.mkdtemp(prefix=f"chrome_debug_{uuid.uuid4().hex[:8]}_")
            chrome_options.add_argument(f'--user-data-dir={unique_dir}')
            
            # 禁用一些可能影響載入的功能
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            self.driver.set_page_load_timeout(60)
            return True
            
        except Exception as e:
            print(f"❌ WebDriver 設置失敗: {e}")
            return False
    
    def debug_uber_eats(self, url):
        """診斷 UberEats 爬取"""
        print(f"\n🚗 診斷 UberEats: {url}")
        print("=" * 60)
        
        try:
            if not self.setup_driver(headless=True):
                print("❌ 無法初始化 WebDriver")
                return
                
            print("📱 正在載入頁面...")
            self.driver.get(url)
            
            # 等待頁面載入
            print("⏳ 等待頁面載入...")
            time.sleep(10)
            
            # 檢查頁面標題
            title = self.driver.title
            print(f"📄 頁面標題: {title}")
            
            # 檢查是否有重新導向
            current_url = self.driver.current_url
            print(f"🔗 當前網址: {current_url}")
            
            # 嘗試找到所有可能的元素
            print("\n🔍 尋找店名元素...")
            name_selectors = [
                'h1[data-testid="store-title"]',
                'h1',
                '[data-testid="store-info-name"]',
                'h1[class*="title"]',
                'h1[class*="name"]'
            ]
            
            for selector in name_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for i, element in enumerate(elements):
                        try:
                            text = element.text.strip()
                            if text:
                                print(f"✅ 找到店名 ({selector}[{i}]): {text}")
                        except:
                            pass
                except Exception as e:
                    print(f"❌ {selector}: {e}")
            
            print("\n🔍 尋找評分元素...")
            rating_selectors = [
                '[data-testid="store-rating"]',
                'div[role="img"][aria-label*="星"]',
                'span[aria-label*="星"]',
                '[data-testid*="rating"]',
                'span[class*="rating"]'
            ]
            
            for selector in rating_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for i, element in enumerate(elements):
                        try:
                            text = element.text.strip()
                            aria_label = element.get_attribute('aria-label') or ''
                            if text or aria_label:
                                print(f"✅ 找到評分元素 ({selector}[{i}]): text='{text}', aria-label='{aria_label}'")
                        except:
                            pass
                except Exception as e:
                    print(f"❌ {selector}: {e}")
            
            print("\n🔍 檢查頁面HTML片段...")
            try:
                page_source = self.driver.page_source
                if 'store' in page_source.lower():
                    print("✅ 頁面包含 'store' 關鍵字")
                if 'rating' in page_source.lower():
                    print("✅ 頁面包含 'rating' 關鍵字")
                if 'review' in page_source.lower():
                    print("✅ 頁面包含 'review' 關鍵字")
                    
                # 尋找可能的評分數字
                rating_matches = re.findall(r'(\d+\.?\d*)\s*星|(\d+\.?\d*)/5|rating.*?(\d+\.?\d*)', page_source.lower())
                if rating_matches:
                    print(f"✅ 在HTML中找到可能的評分: {rating_matches[:5]}")
                    
            except Exception as e:
                print(f"❌ 檢查頁面HTML失敗: {e}")
                
        except Exception as e:
            print(f"❌ UberEats 診斷失敗: {e}")
        finally:
            if self.driver:
                self.driver.quit()
    
    def debug_foodpanda(self, url):
        """診斷 Foodpanda 爬取"""
        print(f"\n🐼 診斷 Foodpanda: {url}")
        print("=" * 60)
        
        try:
            if not self.setup_driver(headless=True):
                print("❌ 無法初始化 WebDriver")
                return
                
            print("📱 正在載入頁面...")
            self.driver.get(url)
            
            # 等待頁面載入
            print("⏳ 等待頁面載入...")
            time.sleep(15)  # Foodpanda 需要更長時間
            
            # 檢查頁面標題
            title = self.driver.title
            print(f"📄 頁面標題: {title}")
            
            # 檢查是否有重新導向
            current_url = self.driver.current_url
            print(f"🔗 當前網址: {current_url}")
            
            # 嘗試找到所有可能的元素
            print("\n🔍 尋找店名元素...")
            name_selectors = [
                'h1[data-testid="vendor-name"]',
                'h1',
                '[data-testid="restaurant-name"]',
                'h1[class*="vendor"]',
                'h1[class*="restaurant"]'
            ]
            
            for selector in name_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for i, element in enumerate(elements):
                        try:
                            text = element.text.strip()
                            if text:
                                print(f"✅ 找到店名 ({selector}[{i}]): {text}")
                        except:
                            pass
                except Exception as e:
                    print(f"❌ {selector}: {e}")
            
            print("\n🔍 尋找評分元素...")
            rating_selectors = [
                '[data-testid="vendor-rating"]',
                'span[data-testid="rating-value"]',
                'div[data-testid="rating"]',
                '[data-testid*="rating"]',
                'span[class*="rating"]'
            ]
            
            for selector in rating_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for i, element in enumerate(elements):
                        try:
                            text = element.text.strip()
                            if text:
                                print(f"✅ 找到評分元素 ({selector}[{i}]): {text}")
                        except:
                            pass
                except Exception as e:
                    print(f"❌ {selector}: {e}")
            
            print("\n🔍 檢查頁面HTML片段...")
            try:
                page_source = self.driver.page_source
                if 'vendor' in page_source.lower():
                    print("✅ 頁面包含 'vendor' 關鍵字")
                if 'rating' in page_source.lower():
                    print("✅ 頁面包含 'rating' 關鍵字")
                if 'review' in page_source.lower():
                    print("✅ 頁面包含 'review' 關鍵字")
                    
                # 尋找可能的評分數字
                rating_matches = re.findall(r'(\d+\.?\d*)\s*星|(\d+\.?\d*)/5|rating.*?(\d+\.?\d*)', page_source.lower())
                if rating_matches:
                    print(f"✅ 在HTML中找到可能的評分: {rating_matches[:5]}")
                    
            except Exception as e:
                print(f"❌ 檢查頁面HTML失敗: {e}")
                
        except Exception as e:
            print(f"❌ Foodpanda 診斷失敗: {e}")
        finally:
            if self.driver:
                self.driver.quit()

def main():
    # 測試網址
    test_urls = {
        'uber': 'https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9?diningMode=DELIVERY',
        'panda': 'https://foodpanda.page.link/yhvLQKDDAScTN5rq7'
    }
    
    diagnostic = ScrapingDiagnostic()
    
    print("🔧 Python 爬取診斷工具")
    print("🎯 診斷 UberEats 和 Foodpanda 爬取問題")
    print()
    
    # 診斷 UberEats
    diagnostic.debug_uber_eats(test_urls['uber'])
    
    print("\n" + "="*80 + "\n")
    
    # 診斷 Foodpanda
    diagnostic.debug_foodpanda(test_urls['panda'])
    
    print("\n🔍 診斷完成")
    print("\n💡 建議修復方案:")
    print("1. 檢查選擇器是否正確")
    print("2. 增加等待時間")
    print("3. 處理動態載入內容")
    print("4. 檢查是否需要處理彈窗或廣告")

if __name__ == "__main__":
    main()