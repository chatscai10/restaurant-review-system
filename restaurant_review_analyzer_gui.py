#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分店評價查詢系統 - Python GUI 工具版本
Restaurant Review Analyzer - Python GUI Tool

功能特色:
- 支援 Google Maps、UberEats、Foodpanda 三個平台
- 輸入記憶功能（自動保存/載入）
- Telegram 通知發送
- 直觀的圖形界面
- 詳細的分析結果顯示

作者: Claude Code
版本: 1.0
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import requests
import json
import threading
import os
from datetime import datetime
import webbrowser

class RestaurantReviewAnalyzer:
    def __init__(self, root):
        self.root = root
        self.root.title("分店評價查詢系統 - Python GUI 工具")
        self.root.geometry("800x900")
        self.root.resizable(True, True)
        
        # 設定圖標
        try:
            self.root.iconbitmap(default='icon.ico')
        except:
            pass  # 如果沒有圖標文件就忽略
            
        # 配置變數
        self.server_url = "http://localhost:3003"
        self.memory_file = "restaurant_memory.json"
        
        # 初始化界面
        self.setup_ui()
        
        # 載入記憶的輸入
        self.load_memory()
        
        # 自動載入 Telegram 群組配置
        self.auto_load_telegram_config()
        
        # 檢查服務器狀態
        self.check_server_status()
    
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
        title_label = ttk.Label(main_frame, text="🏪 分店評價查詢系統", 
                               font=("Arial", 16, "bold"))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # 服務器狀態
        status_frame = ttk.Frame(main_frame)
        status_frame.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 15))
        
        ttk.Label(status_frame, text="🌐 服務器狀態:").grid(row=0, column=0, sticky=tk.W)
        self.status_label = ttk.Label(status_frame, text="檢查中...", foreground="orange")
        self.status_label.grid(row=0, column=1, sticky=tk.W, padx=(10, 0))
        
        self.refresh_btn = ttk.Button(status_frame, text="🔄 重新檢查", 
                                     command=self.check_server_status, width=12)
        self.refresh_btn.grid(row=0, column=2, sticky=tk.E)
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
        
        # 記憶功能按鈕框架
        memory_frame = ttk.Frame(main_frame)
        memory_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 15))
        
        ttk.Button(memory_frame, text="💾 保存輸入", 
                  command=self.save_memory, width=12).grid(row=0, column=0, padx=(0, 5))
        ttk.Button(memory_frame, text="📂 載入輸入", 
                  command=self.load_memory, width=12).grid(row=0, column=1, padx=5)
        ttk.Button(memory_frame, text="🧹 清空輸入", 
                  command=self.clear_inputs, width=12).grid(row=0, column=2, padx=5)
        ttk.Button(memory_frame, text="🌐 開啟網頁版", 
                  command=self.open_web_version, width=15).grid(row=0, column=3, padx=(5, 0))
        
        # Telegram 群組配置框架
        telegram_frame = ttk.LabelFrame(main_frame, text="✈️ Telegram 群組配置", padding="10")
        telegram_frame.grid(row=3.5, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 15))
        telegram_frame.columnconfigure(1, weight=1)
        
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
            group_frame.grid(row=i, column=0, columnspan=4, sticky=(tk.W, tk.E), pady=2)
            group_frame.columnconfigure(1, weight=1)
            
            # 群組名稱
            ttk.Label(group_frame, text=f"群組{i+1}:").grid(row=0, column=0, sticky=tk.W, padx=(0, 5))
            
            name_var = tk.StringVar(value=self.telegram_groups[i]['name'])
            name_entry = ttk.Entry(group_frame, textvariable=name_var, width=15)
            name_entry.grid(row=0, column=1, sticky=tk.W, padx=(0, 5))
            
            # 群組ID
            ttk.Label(group_frame, text="ID:").grid(row=0, column=2, sticky=tk.W, padx=(5, 5))
            
            id_var = tk.StringVar(value=self.telegram_groups[i]['chatId'])
            id_entry = ttk.Entry(group_frame, textvariable=id_var, width=20)
            id_entry.grid(row=0, column=3, sticky=(tk.W, tk.E), padx=(0, 5))
            
            # 啟用檢查框
            enabled_var = tk.BooleanVar(value=self.telegram_groups[i]['enabled'])
            enabled_check = ttk.Checkbutton(group_frame, text="啟用", variable=enabled_var)
            enabled_check.grid(row=0, column=4, sticky=tk.W, padx=(5, 5))
            
            # 測試按鈕
            test_btn = ttk.Button(group_frame, text="🧪 測試", width=8,
                                command=lambda idx=i: self.test_telegram_group(idx))
            test_btn.grid(row=0, column=5, sticky=tk.W, padx=(5, 0))
            
            # 保存變數引用
            self.telegram_group_vars.append({
                'name': name_var,
                'chatId': id_var,
                'enabled': enabled_var,
                'test_btn': test_btn
            })
        
        # Telegram 配置按鈕
        telegram_btn_frame = ttk.Frame(telegram_frame)
        telegram_btn_frame.grid(row=3, column=0, columnspan=4, sticky=(tk.W, tk.E), pady=(10, 0))
        
        ttk.Button(telegram_btn_frame, text="💾 保存群組配置",
                  command=self.save_telegram_config, width=18).grid(row=0, column=0, padx=(0, 5))
        ttk.Button(telegram_btn_frame, text="📂 載入群組配置",
                  command=self.load_telegram_config, width=18).grid(row=0, column=1, padx=5)
        ttk.Button(telegram_btn_frame, text="🧪 測試所有群組",
                  command=self.test_all_telegram_groups, width=18).grid(row=0, column=2, padx=(5, 0))
        
        # 操作按鈕框架
        action_frame = ttk.Frame(main_frame)
        action_frame.grid(row=4, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 15))
        
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
        self.progress_bar.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 15))
        
        # 結果顯示區域
        result_frame = ttk.LabelFrame(main_frame, text="📊 分析結果", padding="10")
        result_frame.grid(row=6, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 15))
        result_frame.columnconfigure(0, weight=1)
        result_frame.rowconfigure(0, weight=1)
        main_frame.rowconfigure(6, weight=1)
        
        self.result_text = scrolledtext.ScrolledText(result_frame, height=15, width=80, 
                                                    wrap=tk.WORD, font=("Consolas", 10))
        self.result_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 狀態欄
        self.status_bar = ttk.Label(main_frame, text="準備就緒", relief=tk.SUNKEN, anchor=tk.W)
        self.status_bar.grid(row=7, column=0, columnspan=3, sticky=(tk.W, tk.E))
        
        # 存儲分析結果
        self.analysis_results = None
    
    def check_server_status(self):
        """檢查服務器狀態"""
        def check():
            try:
                response = requests.get(f"{self.server_url}/health", timeout=5)
                if response.status_code == 200:
                    self.status_label.config(text="✅ 在線", foreground="green")
                    self.analyze_btn.config(state="normal")
                    self.update_status("服務器連接正常")
                else:
                    self.status_label.config(text="❌ 異常", foreground="red")
                    self.analyze_btn.config(state="disabled")
                    self.update_status("服務器連接異常")
            except requests.exceptions.RequestException:
                self.status_label.config(text="❌ 離線", foreground="red")
                self.analyze_btn.config(state="disabled")
                self.update_status("無法連接到服務器")
        
        # 在後台線程中檢查
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
                # 準備數據
                data = {
                    "stores": [{
                        "id": 1,
                        "name": self.store_name_var.get().strip(),
                        "urls": {k: v for k, v in urls.items() if v}
                    }]
                }
                
                # 更新進度
                self.root.after(0, lambda: self.progress_var.set(25))
                
                # 發送請求
                response = requests.post(f"{self.server_url}/api/analyze-stores", 
                                       json=data, timeout=60)
                
                self.root.after(0, lambda: self.progress_var.set(75))
                
                if response.status_code == 200:
                    self.analysis_results = response.json()
                    self.root.after(0, self.display_results)
                    self.root.after(0, lambda: self.telegram_btn.config(state="normal"))
                    self.root.after(0, lambda: self.update_status("分析完成"))
                else:
                    error_msg = f"API錯誤: {response.status_code}"
                    self.root.after(0, lambda: messagebox.showerror("分析失敗", error_msg))
                    self.root.after(0, lambda: self.update_status("分析失敗"))
                
            except requests.exceptions.Timeout:
                self.root.after(0, lambda: messagebox.showerror("請求超時", "分析請求超時，請稍後再試"))
                self.root.after(0, lambda: self.update_status("請求超時"))
            except requests.exceptions.RequestException as e:
                self.root.after(0, lambda: messagebox.showerror("網絡錯誤", f"網絡請求失敗: {str(e)}"))
                self.root.after(0, lambda: self.update_status("網絡錯誤"))
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("未知錯誤", f"發生未知錯誤: {str(e)}"))
                self.root.after(0, lambda: self.update_status("發生錯誤"))
            finally:
                self.root.after(0, lambda: self.progress_var.set(100))
                self.root.after(0, lambda: self.analyze_btn.config(state="normal"))
        
        threading.Thread(target=analyze, daemon=True).start()
    
    def display_results(self):
        """顯示分析結果"""
        if not self.analysis_results:
            return
        
        result_text = "📊 分店評價分析結果\n"
        result_text += "=" * 60 + "\n\n"
        
        # 總體統計
        summary = self.analysis_results.get('summary', {})
        result_text += f"📈 總體統計:\n"
        result_text += f"   分店數量: {summary.get('totalStores', 0)}\n"
        result_text += f"   平均評分: {summary.get('averageRating', 0):.2f}/5.0\n"
        result_text += f"   成功平台: {summary.get('totalPlatforms', 0)}\n"
        result_text += f"   總評論數: {summary.get('totalReviews', 0)}\n"
        result_text += f"   分析時間: {summary.get('analysisTime', 'N/A')}\n\n"
        
        # 詳細結果
        for store in self.analysis_results.get('stores', []):
            result_text += f"🏪 {store['name']}\n"
            result_text += f"📊 店家平均評分: {store['averageRating']:.2f}/5.0\n"
            result_text += "-" * 50 + "\n"
            
            platforms = store.get('platforms', {})
            
            # Google Maps 結果
            if 'google' in platforms:
                google = platforms['google']
                result_text += "🗺️ Google Maps:\n"
                if google.get('success'):
                    result_text += f"   ✅ 評分: {google.get('rating', 'N/A')}/5.0\n"
                    result_text += f"   💬 評論數: {google.get('reviewCount', 'N/A')}\n"
                    result_text += f"   🏪 店名: {google.get('storeName', 'N/A')}\n"
                    if google.get('address'):
                        result_text += f"   📍 地址: {google['address']}\n"
                else:
                    result_text += f"   ❌ 失敗: {google.get('error', '未知錯誤')}\n"
                result_text += f"   ⏱️ 耗時: {google.get('analysisTime', 0)}ms\n\n"
            
            # UberEats 結果
            if 'uber' in platforms:
                uber = platforms['uber']
                result_text += "🚗 UberEats:\n"
                if uber.get('success'):
                    result_text += f"   ✅ 評分: {uber.get('rating', 'N/A')}/5.0\n"
                    review_count = uber.get('reviewCount', 'N/A')
                    if '+' in str(review_count):
                        result_text += f"   💬 評論數: {review_count} (近似值)\n"
                    else:
                        result_text += f"   💬 評論數: {review_count}\n"
                    result_text += f"   🏪 店名: {uber.get('storeName', 'N/A')}\n"
                    if uber.get('deliveryTime'):
                        result_text += f"   🚚 外送時間: {uber['deliveryTime']}\n"
                else:
                    result_text += f"   ❌ 失敗: {uber.get('error', '未知錯誤')}\n"
                result_text += f"   ⏱️ 耗時: {uber.get('analysisTime', 0)}ms\n\n"
            
            # Foodpanda 結果
            if 'panda' in platforms:
                panda = platforms['panda']
                result_text += "🐼 Foodpanda:\n"
                if panda.get('success'):
                    result_text += f"   ✅ 評分: {panda.get('rating', 'N/A')}/5.0\n"
                    review_count = panda.get('reviewCount', 'N/A')
                    if '+' in str(review_count):
                        result_text += f"   💬 評論數: {review_count} (近似值)\n"
                    else:
                        result_text += f"   💬 評論數: {review_count}\n"
                    result_text += f"   🏪 店名: {panda.get('storeName', 'N/A')}\n"
                    if panda.get('deliveryTime'):
                        result_text += f"   🚚 外送時間: {panda['deliveryTime']}\n"
                else:
                    result_text += f"   ❌ 失敗: {panda.get('error', '未知錯誤')}\n"
                result_text += f"   ⏱️ 耗時: {panda.get('analysisTime', 0)}ms\n\n"
            
            # 分析建議
            if store.get('insights'):
                result_text += f"💡 分析建議: {store['insights']}\n"
            
            result_text += "\n"
        
        result_text += "=" * 60 + "\n"
        result_text += f"✅ 分析完成時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        
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
                
                # 獲取當前 Telegram 群組配置
                telegram_groups = self.get_telegram_groups()
                
                request_data = {
                    'analysisResults': self.analysis_results,
                    'telegramGroups': telegram_groups
                }
                
                response = requests.post(f"{self.server_url}/api/send-telegram-notification", 
                                       json=request_data, timeout=30)
                
                if response.status_code == 200 and response.json().get('success'):
                    result = response.json()
                    message = "✅ Telegram通知發送成功！"
                    if result.get('details'):
                        success_count = sum(1 for d in result['details'] if d.get('success'))
                        message += f" ({success_count}/{len(result['details'])} 群組成功)"
                    
                    self.root.after(0, lambda: messagebox.showinfo("成功", message))
                    self.root.after(0, lambda: self.update_status("Telegram通知發送成功"))
                else:
                    error_msg = response.json().get('error', '未知錯誤')
                    self.root.after(0, lambda: messagebox.showerror("發送失敗", f"❌ {error_msg}"))
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
                
                saved_time = memory_data.get("saved_time", "")
                if saved_time:
                    try:
                        dt = datetime.fromisoformat(saved_time.replace('Z', '+00:00'))
                        time_str = dt.strftime('%Y-%m-%d %H:%M:%S')
                        self.update_status(f"已載入記憶 (保存於: {time_str})")
                    except:
                        self.update_status("已載入輸入記憶")
                else:
                    self.update_status("已載入輸入記憶")
                    
        except Exception as e:
            self.update_status("載入記憶失敗")
    
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
    
    def open_web_version(self):
        """開啟網頁版本"""
        try:
            webbrowser.open(self.server_url)
            self.update_status("已開啟網頁版本")
        except Exception as e:
            messagebox.showerror("開啟失敗", f"無法開啟網頁版本: {str(e)}")
    
    def update_status(self, message):
        """更新狀態欄"""
        timestamp = datetime.now().strftime('%H:%M:%S')
        self.status_bar.config(text=f"[{timestamp}] {message}")
    
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
            
            config_file = "telegram_groups_config.json"
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(config_data, f, ensure_ascii=False, indent=2)
            
            messagebox.showinfo("保存成功", "💾 Telegram群組配置已保存")
            self.update_status("Telegram群組配置已保存")
            
        except Exception as e:
            messagebox.showerror("保存失敗", f"無法保存Telegram配置: {str(e)}")
    
    def load_telegram_config(self):
        """載入 Telegram 群組配置"""
        try:
            config_file = "telegram_groups_config.json"
            if os.path.exists(config_file):
                with open(config_file, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
                
                self.set_telegram_groups(config_data.get('groups', []))
                
                saved_time = config_data.get('timestamp', '')
                if saved_time:
                    try:
                        dt = datetime.fromisoformat(saved_time.replace('Z', '+00:00'))
                        time_str = dt.strftime('%Y-%m-%d %H:%M:%S')
                        self.update_status(f"已載入Telegram配置 (保存於: {time_str})")
                    except:
                        self.update_status("已載入Telegram群組配置")
                else:
                    self.update_status("已載入Telegram群組配置")
                    
                messagebox.showinfo("載入成功", "📂 Telegram群組配置已載入")
            else:
                messagebox.showwarning("載入失敗", "沒有找到保存的Telegram配置")
                
        except Exception as e:
            messagebox.showerror("載入失敗", f"載入Telegram配置失敗: {str(e)}")
    
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
                
                response = requests.post(f"{self.server_url}/api/test-telegram-group", 
                                       json={
                                           'chatId': chat_id,
                                           'groupName': group_name
                                       }, timeout=30)
                
                result = response.json()
                
                if result.get('success'):
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
                    try:
                        response = requests.post(f"{self.server_url}/api/test-telegram-group", 
                                               json={
                                                   'chatId': group['chatId'],
                                                   'groupName': group['name']
                                               }, timeout=30)
                        
                        result = response.json()
                        results.append({
                            'group': group['name'],
                            'success': result.get('success', False),
                            'error': result.get('error', '')
                        })
                        
                    except Exception as e:
                        results.append({
                            'group': group['name'],
                            'success': False,
                            'error': str(e)
                        })
                
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
    
    def auto_load_telegram_config(self):
        """自動載入 Telegram 群組配置（靜默模式）"""
        try:
            config_file = "telegram_groups_config.json"
            if os.path.exists(config_file):
                with open(config_file, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
                
                self.set_telegram_groups(config_data.get('groups', []))
                print("✅ 已自動載入 Telegram 群組配置")
        except Exception as e:
            print(f"⚠️ 自動載入 Telegram 配置失敗: {e}")

def main():
    """主函數"""
    root = tk.Tk()
    
    # 設置主題
    try:
        style = ttk.Style()
        style.theme_use('clam')  # 使用較現代的主題
    except:
        pass
    
    # 創建應用
    app = RestaurantReviewAnalyzer(root)
    
    # 處理視窗關閉事件
    def on_closing():
        if messagebox.askokcancel("退出", "確定要關閉分店評價查詢系統嗎？"):
            root.destroy()
    
    root.protocol("WM_DELETE_WINDOW", on_closing)
    
    # 啟動應用
    root.mainloop()

if __name__ == "__main__":
    main()