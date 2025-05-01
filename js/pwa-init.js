// PWA 初始化檢測腳本
// 此腳本在 index.html 中最先載入，確保 PWA 正確啟動

// 全域變數標記 PWA 狀態
window.isPwaMode = false;
window.pwaStartTime = Date.now();

// 添加 PWA 環境檢測標記
(function() {
    // 檢測是否在 GitHub Pages 上
    const isGitHubPages = window.location.hostname.includes('github.io');
    
    // 記錄在 localStorage 中，以便其他腳本使用
    if (isGitHubPages) {
        localStorage.setItem('is_github_pages', 'true');
        console.log('檢測到 GitHub Pages 環境，設置特別處理邏輯');
    } else {
        localStorage.removeItem('is_github_pages');
    }
})();

// 檢測應用程式是否在 PWA 模式下運行
function detectPwaMode() {
    // 檢查顯示模式
    const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
    // 檢查 iOS 的 standalone 模式
    const iosStandalone = window.navigator.standalone === true;
    // 檢查 URL 參數
    const urlParams = new URLSearchParams(window.location.search);
    const fromPwa = urlParams.get('source') === 'pwa';
    
    // 如果滿足任一條件，則認為是在 PWA 模式下運行
    window.isPwaMode = displayModeStandalone || iosStandalone || fromPwa;
    
    console.log(`PWA 檢測: displayModeStandalone=${displayModeStandalone}, iosStandalone=${iosStandalone}, fromPwa=${fromPwa}`);
    console.log(`運行模式: ${window.isPwaMode ? 'PWA' : '瀏覽器'}`);
    
    if (window.isPwaMode) {
        document.documentElement.classList.add('pwa-mode');
    }
    
    return window.isPwaMode;
}

// 檢查並更新 Service Worker
function checkServiceWorkerUpdate() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            // 檢查 Service Worker 版本
            checkVersion(registration).then(version => {
                console.log(`當前 Service Worker 版本: ${version}`);
                
                // 每次啟動時嘗試更新
                registration.update().catch(err => {
                    console.error('Service Worker 更新失敗:', err);
                });
            });
        });
    }
}

// 檢查 Service Worker 版本
function checkVersion(registration) {
    return new Promise((resolve, reject) => {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
            if (event.data && event.data.version) {
                resolve(event.data.version);
            } else {
                resolve('未知');
            }
        };
        
        // 發送消息到 Service Worker
        if (registration.active) {
            registration.active.postMessage({
                type: 'CHECK_VERSION'
            }, [messageChannel.port2]);
        } else {
            resolve('未啟動');
        }
        
        // 設置超時
        setTimeout(() => {
            resolve('超時');
        }, 1000);
    });
}

// 在網頁載入開始時立即檢測
detectPwaMode();

// 監聽 display-mode 媒體查詢的變更
window.matchMedia('(display-mode: standalone)').addEventListener('change', (evt) => {
    console.log('顯示模式變更:', evt.matches ? 'standalone' : 'browser');
    window.isPwaMode = evt.matches || window.navigator.standalone === true;
    
    if (window.isPwaMode) {
        document.documentElement.classList.add('pwa-mode');
    } else {
        document.documentElement.classList.remove('pwa-mode');
    }
});

// 監聽 DOM 載入完成事件
document.addEventListener('DOMContentLoaded', () => {
    console.log(`PWA 初始化：DOM 載入完成，耗時 ${Date.now() - window.pwaStartTime}ms`);
    
    // 再次檢測 PWA 模式（以防初始檢測不準確）
    detectPwaMode();
    
    // 在 PWA 模式下可能需要特殊處理
    if (window.isPwaMode) {
        // 為 body 添加樣式
        document.body.classList.add('pwa-mode');
        
        // 嘗試修正 iOS Safari 的特定問題
        fixIOSSpecificIssues();
        
        // 檢查並更新 Service Worker
        checkServiceWorkerUpdate();
        
        // 處理認證相關問題
        fixPwaAuthIssues();
    }
    
    // 啟用特殊調試模式（僅在需要時）
    if (urlParams.has('pwa-debug')) {
        enablePwaDebug();
    }
});

// 修正 iOS Safari 中的特定問題
function fixIOSSpecificIssues() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (!isIOS) return;
    
    console.log('套用 iOS 特定修正');
    
    // 修正 iOS 上的滾動問題
    document.body.style.webkitOverflowScrolling = 'touch';
    
    // 阻止雙擊放大
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        const lastTouch = window.lastTouchEnd || now;
        const delta = now - lastTouch;
        
        if (delta < 300 && delta > 0) {
            e.preventDefault();
        }
        
        window.lastTouchEnd = now;
    }, false);
    
    // 修正 iOS PWA 中的頁面刷新問題
    window.addEventListener('popstate', (e) => {
        if (window.navigator.standalone) {
            e.preventDefault();
            console.log('防止 iOS PWA 中的瀏覽器後退操作');
        }
    });
    
    // 修正 iOS 焦點問題
    document.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            document.body.classList.add('keyboard-open');
            
            // 滾動到輸入框
            setTimeout(() => {
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    });
    
    document.addEventListener('focusout', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            document.body.classList.remove('keyboard-open');
        }
    });
    
    // 修正 iOS PWA 中的登入問題
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) { // Element
                    checkForLoginRedirects(node);
                }
            }
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

// 檢查並修復有可能導致 iOS 登入問題的重定向頁面
function checkForLoginRedirects(element) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (!isIOS || !window.navigator.standalone) return;
    
    const links = element.querySelectorAll('a[href*="accounts.google.com"], a[href*="oauth"], a[href*="signin"]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // 打開系統瀏覽器處理登入
            window.location.href = link.href;
        });
    });
}

// 處理 PWA 中的認證相關問題
function fixPwaAuthIssues() {
    // 如果 localStorage 中存在 auth_pending 但已經超過 5 分鐘，清除它
    const authPending = localStorage.getItem('auth_pending');
    const authPendingTime = localStorage.getItem('auth_pending_time');
    
    if (authPending) {
        const now = Date.now();
        const pendingTime = parseInt(authPendingTime || '0', 10);
        
        if (now - pendingTime > 5 * 60 * 1000) { // 5 分鐘
            console.log('清除過期的認證狀態');
            localStorage.removeItem('auth_pending');
            localStorage.removeItem('auth_pending_time');
        } else if (!authPendingTime) {
            // 設置當前時間
            localStorage.setItem('auth_pending_time', Date.now().toString());
        }
    }
    
    // 監聽自定義事件
    window.addEventListener('pwa-login-success', (e) => {
        console.log('接收到登入成功事件:', e.detail);
        if (e.detail && e.detail.user) {
            if (typeof showMainPage === 'function') {
                showMainPage(e.detail.user);
            } else if (typeof forceShowMainPage === 'function') {
                forceShowMainPage(e.detail.user);
            }
        }
    });
}

// 啟用 PWA 調試模式
function enablePwaDebug() {
    console.log('啟用 PWA 調試模式');
    
    // 添加診斷訊息顯示
    const debugInfo = document.createElement('div');
    debugInfo.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0,0,0,0.8);
        color: white;
        font-size: 12px;
        padding: 5px;
        z-index: 10000;
        max-height: 150px;
        overflow-y: auto;
    `;
    document.body.appendChild(debugInfo);
    
    // 顯示系統資訊
    const deviceInfo = `
        <strong>PWA 診斷</strong><br>
        User Agent: ${navigator.userAgent}<br>
        Display Mode: ${window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'}<br>
        iOS Standalone: ${window.navigator.standalone ? 'true' : 'false'}<br>
        螢幕大小: ${window.innerWidth}x${window.innerHeight}<br>
        Pixel Ratio: ${window.devicePixelRatio}<br>
    `;
    debugInfo.innerHTML = deviceInfo;
    
    // 攔截 console.log 並顯示在診斷面板中
    const originalConsoleLog = console.log;
    console.log = function(...args) {
        originalConsoleLog.apply(console, args);
        
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
        
        const logEntry = document.createElement('div');
        logEntry.textContent = `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`;
        debugInfo.appendChild(logEntry);
        
        // 保持滾動到最新日誌
        debugInfo.scrollTop = debugInfo.scrollHeight;
        
        // 限制日誌數量
        while (debugInfo.childElementCount > 50) {
            debugInfo.removeChild(debugInfo.firstChild);
        }
    };
    
    // 添加刷新按鈕
    const refreshButton = document.createElement('button');
    refreshButton.textContent = '刷新';
    refreshButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 10001;
        padding: 5px 10px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 4px;
    `;
    refreshButton.addEventListener('click', () => {
        window.location.reload();
    });
    document.body.appendChild(refreshButton);
}

// 獲取 URL 參數
const urlParams = new URLSearchParams(window.location.search);

// 自動登入功能
if (window.isPwaMode && urlParams.has('auto-login')) {
    console.log('啟用自動登入');
    
    // 在 PWA 中，可能需要自動執行登入操作
    window.addEventListener('load', () => {
        setTimeout(() => {
            const googleLoginBtn = document.getElementById('googleLoginBtn');
            if (googleLoginBtn && firebase.auth().currentUser === null) {
                console.log('嘗試自動登入');
                googleLoginBtn.click();
            }
        }, 1000);
    });
}

// 處理網頁可見性變化，用於 PWA 的恢復
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.isPwaMode) {
        console.log('PWA 恢復可見性，檢查認證狀態');
        
        // 檢查用戶是否已登入
        if (firebase && firebase.auth) {
            const currentUser = firebase.auth().currentUser;
            if (currentUser) {
                console.log('用戶已登入，確保 UI 正確');
                if (typeof ensureAuthStateConsistency === 'function') {
                    ensureAuthStateConsistency();
                }
            }
        }
    }
});

// 添加 PWA 緩存清理功能
function addCacheClearingButton() {
    if (!window.isPwaMode) return;
    
    const clearCacheButton = document.createElement('button');
    clearCacheButton.id = 'pwa-clear-cache';
    clearCacheButton.textContent = '清除 PWA 緩存';
    clearCacheButton.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        z-index: 10001;
        padding: 5px 10px;
        background: rgba(255, 0, 0, 0.7);
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        display: none;
    `;
    
    clearCacheButton.addEventListener('click', async () => {
        try {
            console.log('正在清除 PWA 緩存...');
            clearCacheButton.textContent = '正在清除...';
            clearCacheButton.disabled = true;
            
            // 1. 清除所有 caches
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(key => caches.delete(key)));
            
            // 2. 註銷並重新註冊 Service Worker
            if (navigator.serviceWorker) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
            }
            
            // 3. 清除 localStorage 中的 PWA 相關數據
            localStorage.removeItem('auth_pending');
            localStorage.removeItem('auth_pending_time');
            localStorage.removeItem('pwaPromptDisabled');
            localStorage.removeItem('pwaPromptShown');
            localStorage.removeItem('lastPwaPrompt');
            localStorage.removeItem('pwaInstalled');
            
            // 4. 顯示成功消息
            clearCacheButton.textContent = '緩存已清除，重新載入中...';
            
            // 5. 重新載入頁面
            setTimeout(() => {
                window.location.href = '/?pwa-cache-cleared=true';
            }, 1000);
        } catch (error) {
            console.error('清除緩存失敗:', error);
            clearCacheButton.textContent = '清除失敗，請重試';
            clearCacheButton.disabled = false;
        }
    });
    
    document.body.appendChild(clearCacheButton);
    
    // 添加隱藏的手勢：在螢幕上連續點擊 5 次顯示按鈕
    let tapCount = 0;
    let lastTap = 0;
    
    document.addEventListener('click', (e) => {
        const currentTime = new Date().getTime();
        const tapTime = currentTime - lastTap;
        lastTap = currentTime;
        
        if (tapTime < 500) {
            tapCount++;
            if (tapCount >= 5) {
                clearCacheButton.style.display = 'block';
                tapCount = 0;
            }
        } else {
            tapCount = 1;
        }
    });
    
    // 或者使用組合鍵：Shift + Ctrl + C
    document.addEventListener('keydown', (e) => {
        if (e.shiftKey && e.ctrlKey && e.key.toLowerCase() === 'c') {
            clearCacheButton.style.display = clearCacheButton.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    // 檢查 URL 參數，如果存在 pwa-debug，直接顯示按鈕
    if (urlParams.has('pwa-debug')) {
        clearCacheButton.style.display = 'block';
    }
}

// 在網頁載入完成後添加清除緩存按鈕
window.addEventListener('load', () => {
    // 延遲添加，確保其他元素已加載
    setTimeout(addCacheClearingButton, 1000);
});

// 在頁面載入時檢查是否有登入回調
window.addEventListener('load', () => {
    console.log('檢查是否有認證回調參數');
    
    // 獲取 URL 參數
    const urlParams = new URLSearchParams(window.location.search);
    
    // 如果有認證成功標記，清理 URL 並觸發自定義事件
    if (urlParams.has('auth_success') || urlParams.has('github_auth_callback')) {
        console.log('檢測到認證回調參數，處理登入後流程');
        
        // 清除 URL 中的參數以防止循環
        try {
            const baseUrl = window.location.pathname;
            history.replaceState(null, document.title, baseUrl);
            console.log('已清理 URL 參數');
        } catch (e) {
            console.error('清理 URL 參數失敗:', e);
        }
        
        // 觸發認證檢查
        if (typeof firebase !== 'undefined' && firebase.auth) {
            console.log('觸發認證檢查');
            
            // 等待 Firebase 初始化完成
            setTimeout(() => {
                const user = firebase.auth().currentUser;
                if (user) {
                    console.log('用戶已登入:', user.displayName);
                    
                    // 觸發自定義事件
                    try {
                        window.dispatchEvent(new CustomEvent('pwa-login-success', {
                            detail: { user: user }
                        }));
                    } catch (e) {
                        console.error('觸發登入成功事件失敗:', e);
                        
                        // 退路方案 - 直接顯示主頁面
                        if (typeof directlyShowMainPage === 'function') {
                            directlyShowMainPage(user);
                        } else if (typeof showMainPage === 'function') {
                            showMainPage(user);
                        } else if (typeof forceShowMainPage === 'function') {
                            forceShowMainPage(user);
                        }
                    }
                } else {
                    console.log('用戶未登入，可能需要再次嘗試登入');
                    
                    // 嘗試檢查重定向結果
                    if (typeof checkRedirectResult === 'function') {
                        checkRedirectResult();
                    }
                }
            }, 1000);
        }
    }
}); 