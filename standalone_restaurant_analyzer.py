#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
獨立版分店評價查詢系統 - Python GUI 工具
完全獨立運行，不依賴 Node.js 後端

功能特色:
- 完全獨立的 Python 實現
- 內建網頁爬取功能（Selenium）
- 多群組 Telegram 通知
- 配置記憶功能
- 支援 Google Maps、UberEats、Foodpanda

作者: Claude Code
版本: 2.0 (獨立版)
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import requests
import json
import threading
import os
import time
import re
from datetime import datetime
import webbrowser
from urllib.parse import urlparse, parse_qs
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import subprocess
import sys
import uuid

class WebScraper:
    """網頁爬取器"""
    
    def __init__(self):
        self.driver = None
        
    def setup_driver(self):
        """設置 Chrome WebDriver"""
        try:
            chrome_options = Options()
            chrome_options.add_argument('--headless')  # 無頭模式
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1920,1080')
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            
            # 修復WebDriver衝突問題
            import tempfile
            import uuid
            temp_dir = tempfile.gettempdir()
            unique_dir = os.path.join(temp_dir, f"chrome_user_data_{uuid.uuid4().hex[:8]}")
            chrome_options.add_argument(f'--user-data-dir={unique_dir}')
            
            # 禁用自動化檢測
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
    
    def close_driver(self):
        """關閉 WebDriver"""
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass
    
    def scrape_google_maps(self, url):
        """爬取 Google Maps 評價"""
        try:
            if not self.driver:
                if not self.setup_driver():
                    raise Exception("WebDriver 初始化失敗")
            
            print(f"🗺️ 正在分析 Google Maps: {url[:50]}...")
            self.driver.get(url)
            time.sleep(5)
            
            result = {
                'success': False,
                'platform': 'google',
                'storeName': None,
                'rating': None,
                'reviewCount': None,
                'address': None,
                'error': None
            }
            
            try:
                # 店名
                name_selectors = [
                    'h1[data-attrid="title"]',
                    'h1.DUwDvf',
                    'h1.x3AX1-LfntMc-header-title-title',
                    'h1'
                ]
                
                for selector in name_selectors:
                    try:
                        name_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                        result['storeName'] = name_element.text.strip()
                        break
                    except:
                        continue
                
                # 評分
                rating_selectors = [
                    'span.ceNzKf',
                    'div[data-value]',
                    'span[aria-hidden="true"]'
                ]
                
                for selector in rating_selectors:
                    try:
                        rating_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                        for element in rating_elements:
                            text = element.text.strip()
                            if re.match(r'^\d+\.?\d*$', text):
                                rating = float(text)
                                if 0 <= rating <= 5:
                                    result['rating'] = rating
                                    break
                        if result['rating']:
                            break
                    except:
                        continue
                
                # 評論數
                review_selectors = [
                    'span.F7nice',
                    'button[data-value="Sort"]',
                    'span[aria-label*="則評論"]'
                ]
                
                for selector in review_selectors:
                    try:
                        review_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                        for element in review_elements:
                            text = element.text.strip()
                            # 匹配數字（包含逗號）
                            match = re.search(r'([\d,]+)', text)
                            if match:
                                count_text = match.group(1).replace(',', '')
                                if count_text.isdigit():
                                    result['reviewCount'] = int(count_text)
                                    break
                        if result['reviewCount']:
                            break
                    except:
                        continue
                
                # 地址
                try:
                    address_element = self.driver.find_element(By.CSS_SELECTOR, '[data-item-id="address"]')
                    result['address'] = address_element.text.strip()
                except:
                    pass
                
                if result['storeName'] or result['rating']:
                    result['success'] = True
                else:
                    result['error'] = '無法找到店家資訊'
                    
            except Exception as e:
                result['error'] = f'解析頁面失敗: {str(e)}'
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'platform': 'google',
                'error': f'Google Maps 分析失敗: {str(e)}'
            }
    
    def scrape_ubereats(self, url):
        """爬取 UberEats 評價"""
        try:
            if not self.driver:
                if not self.setup_driver():
                    raise Exception("WebDriver 初始化失敗")
            
            print(f"🚗 正在分析 UberEats: {url[:50]}...")
            self.driver.get(url)
            
            # 等待頁面完全載入
            time.sleep(15)
            
            # 嘗試等待關鍵元素出現
            try:
                WebDriverWait(self.driver, 20).until(
                    lambda driver: driver.execute_script("return document.readyState") == "complete"
                )
            except:
                pass
            
            result = {
                'success': False,
                'platform': 'uber',
                'storeName': None,
                'rating': None,
                'reviewCount': None,
                'deliveryTime': None,
                'error': None
            }
            
            try:
                # 店名 - 更多選擇器
                name_selectors = [
                    'h1[data-testid="store-title"]',
                    'h1[data-testid="restaurant-name"]',
                    'h1[aria-level="1"]',
                    'h1[class*="title"]',
                    'h1[class*="name"]',
                    'h1',
                    '[data-testid="store-info-name"]',
                    '[data-testid*="name"]',
                    'div[role="heading"][aria-level="1"]'
                ]
                
                for selector in name_selectors:
                    try:
                        name_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                        result['storeName'] = name_element.text.strip()
                        break
                    except:
                        continue
                
                # 評分和評論數 - 更多選擇器
                rating_selectors = [
                    '[data-testid="store-rating"]',
                    '[data-testid="rating-value"]',
                    '[data-testid*="rating"]',
                    'div[role="img"][aria-label*="星"]',
                    'span[aria-label*="星"]',
                    'div[role="img"][aria-label*="star"]',
                    'span[class*="rating"]',
                    'div[class*="rating"]',
                    'span[class*="star"]'
                ]
                
                for selector in rating_selectors:
                    try:
                        rating_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                        for element in rating_elements:
                            aria_label = element.get_attribute('aria-label') or ''
                            text = element.text.strip()
                            
                            # 從 aria-label 或文本中提取評分
                            rating_match = re.search(r'(\d+\.?\d*)\s*星|(\d+\.?\d*)\s*分|(\d+\.?\d*)/5', aria_label + ' ' + text)
                            if rating_match:
                                rating = float([g for g in rating_match.groups() if g][0])
                                if 0 <= rating <= 5:
                                    result['rating'] = rating
                                    break
                        if result['rating']:
                            break
                    except:
                        continue
                
                # 評論數 - 更多選擇器
                review_selectors = [
                    'span[data-testid="store-reviews-count"]',
                    'span[data-testid="reviews-count"]',
                    '[data-testid*="review"]',
                    'span[aria-label*="評論"]',
                    'span[aria-label*="review"]',
                    'div[data-testid="store-rating-and-review-count"]',
                    'span[class*="review"]',
                    'div[class*="review"]'
                ]
                
                for selector in review_selectors:
                    try:
                        review_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                        for element in review_elements:
                            text = element.text.strip()
                            # 匹配 "600+" 或純數字
                            match = re.search(r'(\d+\+?)', text)
                            if match:
                                result['reviewCount'] = match.group(1)
                                break
                        if result['reviewCount']:
                            break
                    except:
                        continue
                
                # 外送時間
                try:
                    time_elements = self.driver.find_elements(By.CSS_SELECTOR, '[data-testid*="delivery"], [data-testid*="time"]')
                    for element in time_elements:
                        text = element.text.strip()
                        if '分鐘' in text or 'min' in text.lower():
                            result['deliveryTime'] = text
                            break
                except:
                    pass
                
                if result['storeName'] or result['rating']:
                    result['success'] = True
                else:
                    result['error'] = '無法找到店家資訊'
                    
            except Exception as e:
                result['error'] = f'解析頁面失敗: {str(e)}'
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'platform': 'uber',
                'error': f'UberEats 分析失敗: {str(e)}'
            }
    
    def scrape_foodpanda(self, url):
        """爬取 Foodpanda 評價"""
        try:
            if not self.driver:
                if not self.setup_driver():
                    raise Exception("WebDriver 初始化失敗")
            
            print(f"🐼 正在分析 Foodpanda: {url[:50]}...")
            self.driver.get(url)
            
            # 等待頁面完全載入 (Foodpanda 需要更長時間)
            time.sleep(20)
            
            # 嘗試等待關鍵元素出現
            try:
                WebDriverWait(self.driver, 30).until(
                    lambda driver: driver.execute_script("return document.readyState") == "complete"
                )
            except:
                pass
            
            result = {
                'success': False,
                'platform': 'panda',
                'storeName': None,
                'rating': None,
                'reviewCount': None,
                'deliveryTime': None,
                'error': None
            }
            
            try:
                # 店名 - 更多選擇器
                name_selectors = [
                    'h1[data-testid="vendor-name"]',
                    'h1[data-testid="restaurant-name"]', 
                    'h1[data-testid="restaurant-title"]',
                    'h1[class*="vendor"]',
                    'h1[class*="restaurant"]',
                    'h1[class*="title"]',
                    'h1',
                    '[data-testid*="vendor"]',
                    '[data-testid*="restaurant"]',
                    'div[role="heading"][aria-level="1"]'
                ]
                
                for selector in name_selectors:
                    try:
                        name_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                        result['storeName'] = name_element.text.strip()
                        break
                    except:
                        continue
                
                # 評分 - 更多選擇器
                rating_selectors = [
                    '[data-testid="vendor-rating"]',
                    'span[data-testid="rating-value"]',
                    'div[data-testid="rating"]',
                    '[data-testid*="rating"]',
                    'span[class*="rating"]',
                    'div[class*="rating"]',
                    'span[class*="star"]',
                    'div[role="img"][aria-label*="star"]',
                    'span[aria-label*="star"]'
                ]
                
                for selector in rating_selectors:
                    try:
                        rating_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                        for element in rating_elements:
                            text = element.text.strip()
                            rating_match = re.search(r'(\d+\.?\d*)', text)
                            if rating_match:
                                rating = float(rating_match.group(1))
                                if 0 <= rating <= 5:
                                    result['rating'] = rating
                                    break
                        if result['rating']:
                            break
                    except:
                        continue
                
                # 評論數
                review_selectors = [
                    '[data-testid="vendor-review-count"]',
                    'span[data-testid="review-count"]',
                    'div[data-testid="reviews"]'
                ]
                
                for selector in review_selectors:
                    try:
                        review_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                        for element in review_elements:
                            text = element.text.strip()
                            match = re.search(r'(\d+\+?)', text)
                            if match:
                                result['reviewCount'] = match.group(1)
                                break
                        if result['reviewCount']:
                            break
                    except:
                        continue
                
                if result['storeName'] or result['rating']:
                    result['success'] = True
                else:
                    result['error'] = '無法找到店家資訊'
                    
            except Exception as e:
                result['error'] = f'解析頁面失敗: {str(e)}'
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'platform': 'panda',
                'error': f'Foodpanda 分析失敗: {str(e)}'
            }

class TelegramNotifier:
    """Telegram 通知器"""
    
    def __init__(self):
        self.bot_token = '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc'
        self.base_url = f'https://api.telegram.org/bot{self.bot_token}'
    
    def send_notification(self, results, groups):
        """發送通知到多個群組"""
        enabled_groups = [g for g in groups if g.get('enabled') and g.get('chatId')]
        
        if not enabled_groups:
            return {'success': False, 'error': '沒有啟用的群組'}
        
        message = self.format_message(results)
        send_results = []
        
        for group in enabled_groups:
            try:
                success = self.send_message(message, group['chatId'])
                send_results.append({
                    'group': group['name'],
                    'success': success,
                    'error': None if success else '發送失敗'
                })
            except Exception as e:
                send_results.append({
                    'group': group['name'],
                    'success': False,
                    'error': str(e)
                })
        
        success_count = sum(1 for r in send_results if r['success'])
        
        return {
            'success': success_count > 0,
            'message': f'發送到 {success_count}/{len(send_results)} 個群組',
            'details': send_results
        }
    
    def send_message(self, message, chat_id):
        """發送訊息到指定群組"""
        try:
            url = f"{self.base_url}/sendMessage"
            data = {
                'chat_id': chat_id,
                'text': message,
                'parse_mode': 'HTML'
            }
            
            response = requests.post(url, data=data, timeout=30)
            return response.status_code == 200 and response.json().get('ok', False)
            
        except Exception as e:
            print(f"❌ 發送訊息失敗: {e}")
            return False
    
    def test_group(self, chat_id, group_name):
        """測試群組連接"""
        test_message = f"""🧪 群組連接測試
📱 群組: {group_name}
⏰ 測試時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
✅ 如果您收到此訊息，表示此群組配置正常！

🤖 獨立版分店評價查詢系統"""
        
        try:
            success = self.send_message(test_message, chat_id)
            return {'success': success, 'group': group_name}
        except Exception as e:
            return {'success': False, 'group': group_name, 'error': str(e)}
    
    def format_message(self, results):
        """格式化通知訊息"""
        if not results or not results.get('stores'):
            return "❌ 沒有分析結果可發送"
        
        store = results['stores'][0]
        time_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        message = f"""✈️ 分店評價查詢結果通知
━━━━━━━━━━━━━━━━━━━━━━
🔍 分店: {store.get('name', '未知')}
⏰ 查詢時間: {time_str}
📊 平均評分: {store.get('averageRating', 0):.1f}/5.0

"""
        
        platforms = store.get('platforms', {})
        
        # Google Maps
        if platforms.get('google', {}).get('success'):
            google = platforms['google']
            message += f"""🗺️ Google Maps
🏪 店名: {google.get('storeName', 'N/A')}
⭐ 評分: {google.get('rating', 'N/A')}/5.0
💬 評論數: {google.get('reviewCount', 'N/A')}
📍 地址: {google.get('address', 'N/A')}

"""
        
        # UberEats
        if platforms.get('uber', {}).get('success'):
            uber = platforms['uber']
            message += f"""🚗 UberEats
🏪 店名: {uber.get('storeName', 'N/A')}
⭐ 評分: {uber.get('rating', 'N/A')}/5.0
💬 評論數: {uber.get('reviewCount', 'N/A')}
🚚 外送時間: {uber.get('deliveryTime', 'N/A')}

"""
        
        # Foodpanda
        if platforms.get('panda', {}).get('success'):
            panda = platforms['panda']
            message += f"""🐼 Foodpanda
🏪 店名: {panda.get('storeName', 'N/A')}
⭐ 評分: {panda.get('rating', 'N/A')}/5.0
💬 評論數: {panda.get('reviewCount', 'N/A')}
🚚 外送時間: {panda.get('deliveryTime', 'N/A')}

"""
        
        message += "🤖 由獨立版分店評價查詢系統自動發送"
        
        return message

class StandaloneRestaurantAnalyzer:
    """獨立版分店評價查詢系統"""
    
    def __init__(self, root):
        self.root = root
        self.root.title("獨立版分店評價查詢系統 - 完全獨立運行")
        self.root.geometry("900x800")
        self.root.resizable(True, True)
        
        # 配置文件
        self.memory_file = "standalone_restaurant_memory.json"
        self.telegram_config_file = "standalone_telegram_config.json"
        
        # 核心組件
        self.scraper = WebScraper()
        self.telegram_notifier = TelegramNotifier()
        self.analysis_results = None
        
        # 初始化界面
        self.setup_ui()
        
        # 載入配置
        self.load_memory()
        self.load_telegram_config()
        
        # 檢查依賴
        self.check_dependencies()
    
    def setup_ui(self):
        """設置用戶界面"""
        # 創建主框架
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 配置網格權重
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # 標題
        title_label = ttk.Label(main_frame, text="🏪 獨立版分店評價查詢系統", 
                               font=("Arial", 16, "bold"))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # 依賴狀態
        status_frame = ttk.Frame(main_frame)
        status_frame.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 15))
        
        ttk.Label(status_frame, text="🔧 系統狀態:").grid(row=0, column=0, sticky=tk.W)
        self.status_label = ttk.Label(status_frame, text="檢查中...", foreground="orange")
        self.status_label.grid(row=0, column=1, sticky=tk.W, padx=(10, 0))
        
        self.check_btn = ttk.Button(status_frame, text="🔄 重新檢查", 
                                   command=self.check_dependencies, width=12)
        self.check_btn.grid(row=0, column=2, sticky=tk.E)
        status_frame.columnconfigure(1, weight=1)
        
        # 分店資訊框架
        store_frame = ttk.LabelFrame(main_frame, text="📝 分店資訊輸入", padding="10")
        store_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 15))
        store_frame.columnconfigure(1, weight=1)
        
        # 分店名稱
        ttk.Label(store_frame, text="🏪 分店名稱:").grid(row=0, column=0, sticky=tk.W, pady=(0, 10))
        self.store_name_var = tk.StringVar()
        self.store_name_entry = ttk.Entry(store_frame, textvariable=self.store_name_var, width=40)
        self.store_name_entry.grid(row=0, column=1, sticky=(tk.W, tk.E), pady=(0, 10), padx=(10, 0))
        
        # Google Maps 網址
        ttk.Label(store_frame, text="🗺️ Google Maps:").grid(row=1, column=0, sticky=tk.W, pady=(0, 10))
        self.google_url_var = tk.StringVar()
        self.google_url_entry = ttk.Entry(store_frame, textvariable=self.google_url_var, width=40)
        self.google_url_entry.grid(row=1, column=1, sticky=(tk.W, tk.E), pady=(0, 10), padx=(10, 0))
        
        # UberEats 網址
        ttk.Label(store_frame, text="🚗 UberEats:").grid(row=2, column=0, sticky=tk.W, pady=(0, 10))
        self.uber_url_var = tk.StringVar()
        self.uber_url_entry = ttk.Entry(store_frame, textvariable=self.uber_url_var, width=40)
        self.uber_url_entry.grid(row=2, column=1, sticky=(tk.W, tk.E), pady=(0, 10), padx=(10, 0))
        
        # Foodpanda 網址
        ttk.Label(store_frame, text="🐼 Foodpanda:").grid(row=3, column=0, sticky=tk.W, pady=(0, 10))
        self.panda_url_var = tk.StringVar()
        self.panda_url_entry = ttk.Entry(store_frame, textvariable=self.panda_url_var, width=40)
        self.panda_url_entry.grid(row=3, column=1, sticky=(tk.W, tk.E), pady=(0, 10), padx=(10, 0))
        
        # 記憶功能按鈕
        memory_frame = ttk.Frame(main_frame)
        memory_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 15))
        
        ttk.Button(memory_frame, text="💾 保存輸入", 
                  command=self.save_memory, width=12).grid(row=0, column=0, padx=(0, 5))
        ttk.Button(memory_frame, text="📂 載入輸入", 
                  command=self.load_memory, width=12).grid(row=0, column=1, padx=5)
        ttk.Button(memory_frame, text="🧹 清空輸入", 
                  command=self.clear_inputs, width=12).grid(row=0, column=2, padx=(5, 0))
        
        # Telegram 群組配置
        self.setup_telegram_ui(main_frame, row=4)
        
        # 操作按鈕
        action_frame = ttk.Frame(main_frame)
        action_frame.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 15))
        
        self.analyze_btn = ttk.Button(action_frame, text="📊 開始分析評價", 
                                     command=self.start_analysis, width=20)
        self.analyze_btn.grid(row=0, column=0, padx=(0, 10))
        
        self.telegram_btn = ttk.Button(action_frame, text="✈️ 發送Telegram通知", 
                                      command=self.send_telegram_notification, 
                                      width=20, state="disabled")
        self.telegram_btn.grid(row=0, column=1)
        
        # 進度條
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(main_frame, variable=self.progress_var, 
                                           mode='determinate', length=400)
        self.progress_bar.grid(row=6, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 15))
        
        # 結果顯示區域
        result_frame = ttk.LabelFrame(main_frame, text="📊 分析結果", padding="10")
        result_frame.grid(row=7, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 15))
        result_frame.columnconfigure(0, weight=1)
        result_frame.rowconfigure(0, weight=1)
        main_frame.rowconfigure(7, weight=1)
        
        self.result_text = scrolledtext.ScrolledText(result_frame, height=15, width=80, 
                                                    wrap=tk.WORD, font=("Consolas", 9))
        self.result_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 狀態欄
        self.status_bar = ttk.Label(main_frame, text="準備就緒 - 獨立運行模式", relief=tk.SUNKEN, anchor=tk.W)
        self.status_bar.grid(row=8, column=0, columnspan=3, sticky=(tk.W, tk.E))
    
    def setup_telegram_ui(self, parent, row):
        """設置 Telegram 群組配置界面"""
        telegram_frame = ttk.LabelFrame(parent, text="✈️ Telegram 群組配置", padding="10")
        telegram_frame.grid(row=row, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 15))
        telegram_frame.columnconfigure(2, weight=1)
        
        # 群組配置變數
        self.telegram_groups = [
            {'name': '主要群組', 'chatId': '-1002658082392', 'enabled': True},
            {'name': '備用群組1', 'chatId': '', 'enabled': False},
            {'name': '備用群組2', 'chatId': '', 'enabled': False}
        ]
        
        # 創建群組配置UI
        self.telegram_group_vars = []
        for i in range(3):
            # 群組框架
            group_frame = ttk.Frame(telegram_frame)
            group_frame.grid(row=i, column=0, columnspan=6, sticky=(tk.W, tk.E), pady=2)
            group_frame.columnconfigure(2, weight=1)
            
            # 群組名稱
            ttk.Label(group_frame, text=f"群組{i+1}:").grid(row=0, column=0, sticky=tk.W, padx=(0, 5))
            
            name_var = tk.StringVar(value=self.telegram_groups[i]['name'])
            name_entry = ttk.Entry(group_frame, textvariable=name_var, width=12)
            name_entry.grid(row=0, column=1, sticky=tk.W, padx=(0, 5))
            
            # 群組ID
            id_var = tk.StringVar(value=self.telegram_groups[i]['chatId'])
            id_entry = ttk.Entry(group_frame, textvariable=id_var, width=25)
            id_entry.grid(row=0, column=2, sticky=(tk.W, tk.E), padx=(0, 5))
            
            # 啟用檢查框
            enabled_var = tk.BooleanVar(value=self.telegram_groups[i]['enabled'])
            enabled_check = ttk.Checkbutton(group_frame, text="啟用", variable=enabled_var)
            enabled_check.grid(row=0, column=3, sticky=tk.W, padx=(5, 5))
            
            # 測試按鈕
            test_btn = ttk.Button(group_frame, text="🧪 測試", width=8,
                                command=lambda idx=i: self.test_telegram_group(idx))
            test_btn.grid(row=0, column=4, sticky=tk.W, padx=(5, 0))
            
            # 保存變數引用
            self.telegram_group_vars.append({
                'name': name_var,
                'chatId': id_var,
                'enabled': enabled_var,
                'test_btn': test_btn
            })
        
        # Telegram 配置按鈕
        telegram_btn_frame = ttk.Frame(telegram_frame)
        telegram_btn_frame.grid(row=3, column=0, columnspan=6, sticky=(tk.W, tk.E), pady=(10, 0))
        
        ttk.Button(telegram_btn_frame, text="💾 保存群組配置",
                  command=self.save_telegram_config, width=15).grid(row=0, column=0, padx=(0, 5))
        ttk.Button(telegram_btn_frame, text="📂 載入群組配置",
                  command=self.load_telegram_config, width=15).grid(row=0, column=1, padx=5)
        ttk.Button(telegram_btn_frame, text="🧪 測試所有群組",
                  command=self.test_all_telegram_groups, width=15).grid(row=0, column=2, padx=(5, 0))
    
    def check_dependencies(self):
        """檢查系統依賴"""
        def check():
            try:
                # 檢查 Selenium
                try:
                    from selenium import webdriver
                    selenium_ok = True
                except ImportError:
                    selenium_ok = False
                
                # 檢查 Chrome Driver
                try:
                    chrome_options = Options()
                    chrome_options.add_argument('--headless')
                    chrome_options.add_argument('--no-sandbox')
                    driver = webdriver.Chrome(options=chrome_options)
                    driver.quit()
                    chrome_ok = True
                except Exception:
                    chrome_ok = False
                
                # 檢查網絡連接
                try:
                    requests.get('https://www.google.com', timeout=5)
                    network_ok = True
                except:
                    network_ok = False
                
                # 更新狀態
                if selenium_ok and chrome_ok and network_ok:
                    self.root.after(0, lambda: self.status_label.config(text="✅ 系統就緒", foreground="green"))
                    self.root.after(0, lambda: self.analyze_btn.config(state="normal"))
                elif not selenium_ok:
                    self.root.after(0, lambda: self.status_label.config(text="❌ 缺少 Selenium", foreground="red"))
                    self.root.after(0, lambda: self.analyze_btn.config(state="disabled"))
                elif not chrome_ok:
                    self.root.after(0, lambda: self.status_label.config(text="❌ 缺少 ChromeDriver", foreground="red"))
                    self.root.after(0, lambda: self.analyze_btn.config(state="disabled"))
                else:
                    self.root.after(0, lambda: self.status_label.config(text="⚠️ 網絡異常", foreground="orange"))
                    self.root.after(0, lambda: self.analyze_btn.config(state="normal"))
                
            except Exception as e:
                self.root.after(0, lambda: self.status_label.config(text="❌ 檢查失敗", foreground="red"))
                self.root.after(0, lambda: self.analyze_btn.config(state="disabled"))
        
        threading.Thread(target=check, daemon=True).start()
    
    def start_analysis(self):
        """開始分析評價"""
        # 驗證輸入
        if not self.store_name_var.get().strip():
            messagebox.showerror("輸入錯誤", "請輸入分店名稱")
            return
        
        urls = {
            'google': self.google_url_var.get().strip(),
            'uber': self.uber_url_var.get().strip(),
            'panda': self.panda_url_var.get().strip()
        }
        
        if not any(urls.values()):
            messagebox.showerror("輸入錯誤", "至少需要提供一個平台的網址")
            return
        
        # 禁用按鈕
        self.analyze_btn.config(state="disabled")
        self.telegram_btn.config(state="disabled")
        
        # 清空結果
        self.result_text.delete(1.0, tk.END)
        
        # 啟動進度條
        self.progress_var.set(0)
        self.update_status("正在分析...")
        
        # 在後台線程中執行分析
        def analyze():
            try:
                store_name = self.store_name_var.get().strip()
                
                # 準備結果結構
                results = {
                    'summary': {
                        'totalStores': 1,
                        'averageRating': 0,
                        'totalPlatforms': 0,
                        'totalReviews': 0,
                        'analysisTime': datetime.now().isoformat()
                    },
                    'stores': [{
                        'id': 1,
                        'name': store_name,
                        'averageRating': 0,
                        'platforms': {},
                        'insights': None
                    }]
                }
                
                store = results['stores'][0]
                total_rating = 0
                valid_platforms = 0
                
                # 更新進度
                self.root.after(0, lambda: self.progress_var.set(10))
                
                # 分析各平台
                for platform, url in urls.items():
                    if url:
                        try:
                            self.root.after(0, lambda p=platform: self.update_status(f"正在分析 {p}..."))
                            
                            if platform == 'google':
                                result = self.scraper.scrape_google_maps(url)
                            elif platform == 'uber':
                                result = self.scraper.scrape_ubereats(url)
                            elif platform == 'panda':
                                result = self.scraper.scrape_foodpanda(url)
                            
                            result['url'] = url
                            store['platforms'][platform] = result
                            
                            if result.get('success') and result.get('rating'):
                                total_rating += result['rating']
                                valid_platforms += 1
                                
                                # 累積評論數
                                review_count = result.get('reviewCount', 0)
                                if isinstance(review_count, str):
                                    # 處理 "600+" 格式
                                    match = re.search(r'(\d+)', review_count)
                                    if match:
                                        results['summary']['totalReviews'] += int(match.group(1))
                                elif isinstance(review_count, int):
                                    results['summary']['totalReviews'] += review_count
                            
                            # 更新進度
                            progress = 10 + (valid_platforms * 25)
                            self.root.after(0, lambda p=progress: self.progress_var.set(p))
                            
                        except Exception as e:
                            error_result = {
                                'success': False,
                                'platform': platform,
                                'error': str(e),
                                'url': url
                            }
                            store['platforms'][platform] = error_result
                
                # 計算平均評分
                if valid_platforms > 0:
                    store['averageRating'] = total_rating / valid_platforms
                    results['summary']['averageRating'] = store['averageRating']
                    results['summary']['totalPlatforms'] = valid_platforms
                
                # 生成洞察
                store['insights'] = self.generate_insights(store)
                
                # 保存結果
                self.analysis_results = results
                
                # 顯示結果
                self.root.after(0, self.display_results)
                self.root.after(0, lambda: self.telegram_btn.config(state="normal"))
                self.root.after(0, lambda: self.update_status("分析完成"))
                
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("分析失敗", f"分析過程中發生錯誤: {str(e)}"))
                self.root.after(0, lambda: self.update_status("分析失敗"))
            finally:
                self.root.after(0, lambda: self.progress_var.set(100))
                self.root.after(0, lambda: self.analyze_btn.config(state="normal"))
                # 關閉瀏覽器
                self.scraper.close_driver()
        
        threading.Thread(target=analyze, daemon=True).start()
    
    def generate_insights(self, store):
        """生成分析洞察"""
        platforms = store.get('platforms', {})
        valid_platforms = [p for p in platforms.values() if p.get('success')]
        
        if not valid_platforms:
            return '無法獲取評價數據，建議檢查網址是否正確'
        
        avg_rating = store.get('averageRating', 0)
        
        if avg_rating >= 4.5:
            return '表現優秀！繼續保持高品質服務'
        elif avg_rating >= 4.0:
            return '表現良好，可考慮進一步提升服務品質'
        elif avg_rating >= 3.5:
            return '表現一般，建議重點改善客戶體驗'
        else:
            return '需要緊急改善服務品質和客戶滿意度'
    
    def display_results(self):
        """顯示分析結果"""
        if not self.analysis_results:
            return
        
        result_text = "📊 獨立版分店評價分析結果\n"
        result_text += "=" * 60 + "\n\n"
        
        # 總體統計
        summary = self.analysis_results.get('summary', {})
        result_text += f"📈 總體統計:\n"
        result_text += f"   分店數量: {summary.get('totalStores', 0)}\n"
        result_text += f"   平均評分: {summary.get('averageRating', 0):.2f}/5.0\n"
        result_text += f"   成功平台: {summary.get('totalPlatforms', 0)}\n"
        result_text += f"   總評論數: {summary.get('totalReviews', 0)}\n\n"
        
        # 詳細結果
        for store in self.analysis_results.get('stores', []):
            result_text += f"🏪 {store['name']}\n"
            result_text += f"📊 店家平均評分: {store['averageRating']:.2f}/5.0\n"
            result_text += "-" * 50 + "\n"
            
            platforms = store.get('platforms', {})
            
            # 各平台結果
            platform_names = {'google': '🗺️ Google Maps', 'uber': '🚗 UberEats', 'panda': '🐼 Foodpanda'}
            
            for platform_key, platform_name in platform_names.items():
                if platform_key in platforms:
                    platform = platforms[platform_key]
                    result_text += f"{platform_name}:\n"
                    
                    if platform.get('success'):
                        result_text += f"   ✅ 評分: {platform.get('rating', 'N/A')}/5.0\n"
                        result_text += f"   💬 評論數: {platform.get('reviewCount', 'N/A')}\n"
                        result_text += f"   🏪 店名: {platform.get('storeName', 'N/A')}\n"
                        
                        if platform.get('address'):
                            result_text += f"   📍 地址: {platform['address']}\n"
                        if platform.get('deliveryTime'):
                            result_text += f"   🚚 外送時間: {platform['deliveryTime']}\n"
                    else:
                        result_text += f"   ❌ 失敗: {platform.get('error', '未知錯誤')}\n"
                    
                    result_text += "\n"
            
            # 分析建議
            if store.get('insights'):
                result_text += f"💡 分析建議: {store['insights']}\n"
            
            result_text += "\n"
        
        result_text += "=" * 60 + "\n"
        result_text += f"✅ 分析完成時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        result_text += "🤖 由獨立版分店評價查詢系統提供\n"
        
        # 顯示結果
        self.result_text.delete(1.0, tk.END)
        self.result_text.insert(1.0, result_text)
    
    def send_telegram_notification(self):
        """發送Telegram通知"""
        if not self.analysis_results:
            messagebox.showerror("錯誤", "沒有可發送的分析結果")
            return
        
        def send():
            try:
                self.root.after(0, lambda: self.update_status("正在發送Telegram通知..."))
                
                # 獲取群組配置
                groups = self.get_telegram_groups()
                
                # 發送通知
                result = self.telegram_notifier.send_notification(self.analysis_results, groups)
                
                if result['success']:
                    message = f"✅ Telegram通知發送成功！{result['message']}"
                    self.root.after(0, lambda: messagebox.showinfo("成功", message))
                    self.root.after(0, lambda: self.update_status("Telegram通知發送成功"))
                else:
                    self.root.after(0, lambda: messagebox.showerror("發送失敗", f"❌ {result['error']}"))
                    self.root.after(0, lambda: self.update_status("Telegram通知發送失敗"))
                    
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("網絡錯誤", f"發送失敗: {str(e)}"))
                self.root.after(0, lambda: self.update_status("發送失敗"))
        
        threading.Thread(target=send, daemon=True).start()
    
    def save_memory(self):
        """保存輸入記憶"""
        try:
            memory_data = {
                "store_name": self.store_name_var.get(),
                "google_url": self.google_url_var.get(),
                "uber_url": self.uber_url_var.get(),
                "panda_url": self.panda_url_var.get(),
                "saved_time": datetime.now().isoformat()
            }
            
            with open(self.memory_file, 'w', encoding='utf-8') as f:
                json.dump(memory_data, f, ensure_ascii=False, indent=2)
            
            messagebox.showinfo("保存成功", "💾 輸入記憶已保存")
            self.update_status("輸入記憶已保存")
            
        except Exception as e:
            messagebox.showerror("保存失敗", f"無法保存記憶: {str(e)}")
    
    def load_memory(self):
        """載入輸入記憶"""
        try:
            if os.path.exists(self.memory_file):
                with open(self.memory_file, 'r', encoding='utf-8') as f:
                    memory_data = json.load(f)
                
                self.store_name_var.set(memory_data.get("store_name", ""))
                self.google_url_var.set(memory_data.get("google_url", ""))
                self.uber_url_var.set(memory_data.get("uber_url", ""))
                self.panda_url_var.set(memory_data.get("panda_url", ""))
                
                print("✅ 已自動載入輸入記憶")
        except Exception as e:
            print(f"⚠️ 載入記憶失敗: {e}")
    
    def clear_inputs(self):
        """清空所有輸入"""
        if messagebox.askyesno("確認清空", "確定要清空所有輸入嗎？"):
            self.store_name_var.set("")
            self.google_url_var.set("")
            self.uber_url_var.set("")
            self.panda_url_var.set("")
            self.result_text.delete(1.0, tk.END)
            self.telegram_btn.config(state="disabled")
            self.analysis_results = None
            self.update_status("已清空所有輸入")
    
    def get_telegram_groups(self):
        """獲取當前 Telegram 群組配置"""
        groups = []
        for i, group_vars in enumerate(self.telegram_group_vars):
            name = group_vars['name'].get().strip()
            chat_id = group_vars['chatId'].get().strip()
            enabled = group_vars['enabled'].get()
            
            groups.append({
                'name': name or f'群組{i+1}',
                'chatId': chat_id,
                'enabled': enabled and chat_id != ''
            })
        
        return groups
    
    def set_telegram_groups(self, groups):
        """設定 Telegram 群組配置"""
        for i, group_vars in enumerate(self.telegram_group_vars):
            if i < len(groups):
                group_vars['name'].set(groups[i].get('name', ''))
                group_vars['chatId'].set(groups[i].get('chatId', ''))
                group_vars['enabled'].set(groups[i].get('enabled', False))
            else:
                group_vars['name'].set('')
                group_vars['chatId'].set('')
                group_vars['enabled'].set(False)
    
    def save_telegram_config(self):
        """保存 Telegram 群組配置"""
        try:
            groups = self.get_telegram_groups()
            config_data = {
                'groups': groups,
                'timestamp': datetime.now().isoformat()
            }
            
            with open(self.telegram_config_file, 'w', encoding='utf-8') as f:
                json.dump(config_data, f, ensure_ascii=False, indent=2)
            
            messagebox.showinfo("保存成功", "💾 Telegram群組配置已保存")
            self.update_status("Telegram群組配置已保存")
            
        except Exception as e:
            messagebox.showerror("保存失敗", f"無法保存Telegram配置: {str(e)}")
    
    def load_telegram_config(self):
        """載入 Telegram 群組配置"""
        try:
            if os.path.exists(self.telegram_config_file):
                with open(self.telegram_config_file, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
                
                self.set_telegram_groups(config_data.get('groups', []))
                print("✅ 已自動載入 Telegram 群組配置")
        except Exception as e:
            print(f"⚠️ 載入 Telegram 配置失敗: {e}")
    
    def test_telegram_group(self, group_index):
        """測試特定群組連接"""
        if group_index >= len(self.telegram_group_vars):
            return
            
        group_vars = self.telegram_group_vars[group_index]
        group_name = group_vars['name'].get().strip() or f'群組{group_index + 1}'
        chat_id = group_vars['chatId'].get().strip()
        
        if not chat_id:
            messagebox.showerror("錯誤", "請先輸入群組ID")
            return
        
        def test():
            try:
                self.root.after(0, lambda: self.update_status(f"正在測試群組 {group_name}..."))
                
                result = self.telegram_notifier.test_group(chat_id, group_name)
                
                if result['success']:
                    self.root.after(0, lambda: messagebox.showinfo("測試成功", f"✅ 群組 \"{group_name}\" 連接測試成功！"))
                    self.root.after(0, lambda: self.update_status(f"群組 {group_name} 測試成功"))
                else:
                    error_msg = result.get('error', '未知錯誤')
                    self.root.after(0, lambda: messagebox.showerror("測試失敗", f"❌ 群組 \"{group_name}\" 測試失敗: {error_msg}"))
                    self.root.after(0, lambda: self.update_status(f"群組 {group_name} 測試失敗"))
                    
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("網絡錯誤", f"測試失敗: {str(e)}"))
                self.root.after(0, lambda: self.update_status("群組測試失敗"))
        
        threading.Thread(target=test, daemon=True).start()
    
    def test_all_telegram_groups(self):
        """測試所有啟用的群組"""
        groups = self.get_telegram_groups()
        enabled_groups = [g for g in groups if g['enabled'] and g['chatId']]
        
        if not enabled_groups:
            messagebox.showwarning("警告", "沒有啟用的群組可以測試")
            return
        
        def test_all():
            try:
                self.root.after(0, lambda: self.update_status(f"正在測試 {len(enabled_groups)} 個群組..."))
                
                results = []
                for group in enabled_groups:
                    result = self.telegram_notifier.test_group(group['chatId'], group['name'])
                    results.append(result)
                
                success_count = sum(1 for r in results if r['success'])
                message = f"📊 測試完成: {success_count}/{len(results)} 個群組連接成功"
                
                if success_count == len(results):
                    self.root.after(0, lambda: messagebox.showinfo("測試完成", f"✅ {message}"))
                else:
                    failed_groups = [r['group'] for r in results if not r['success']]
                    detail_msg = f"{message}\n\n失敗的群組: {', '.join(failed_groups)}"
                    self.root.after(0, lambda: messagebox.showwarning("測試完成", f"⚠️ {detail_msg}"))
                
                self.root.after(0, lambda: self.update_status(message))
                
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("錯誤", f"測試過程中發生錯誤: {str(e)}"))
                self.root.after(0, lambda: self.update_status("群組測試失敗"))
        
        threading.Thread(target=test_all, daemon=True).start()
    
    def update_status(self, message):
        """更新狀態欄"""
        timestamp = datetime.now().strftime('%H:%M:%S')
        self.status_bar.config(text=f"[{timestamp}] {message}")

def install_requirements():
    """安裝必要的依賴"""
    required_packages = ['selenium', 'requests']
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package} 已安裝")
        except ImportError:
            print(f"⚠️ 正在安裝 {package}...")
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
                print(f"✅ {package} 安裝成功")
            except subprocess.CalledProcessError:
                print(f"❌ {package} 安裝失敗")
                return False
    
    return True

def main():
    """主函數"""
    print("🚀 獨立版分店評價查詢系統啟動")
    print("=" * 50)
    
    # 檢查並安裝依賴
    if not install_requirements():
        print("❌ 依賴安裝失敗，程式無法繼續執行")
        input("按 Enter 鍵退出...")
        return
    
    # 創建主視窗
    root = tk.Tk()
    
    # 設置主題
    try:
        style = ttk.Style()
        style.theme_use('clam')
    except:
        pass
    
    # 創建應用
    app = StandaloneRestaurantAnalyzer(root)
    
    # 處理視窗關閉事件
    def on_closing():
        if messagebox.askokcancel("退出", "確定要關閉獨立版分店評價查詢系統嗎？"):
            # 關閉瀏覽器
            app.scraper.close_driver()
            root.destroy()
    
    root.protocol("WM_DELETE_WINDOW", on_closing)
    
    print("✅ GUI 界面已啟動")
    print("📝 注意事項：")
    print("   - 需要安裝 Chrome 瀏覽器和 ChromeDriver")
    print("   - 首次使用會自動下載 ChromeDriver")
    print("   - 完全獨立運行，不依賴 Node.js 後端")
    
    # 啟動應用
    root.mainloop()

if __name__ == "__main__":
    main()