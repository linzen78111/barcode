// PWA 處理程式

// 註冊 Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker 註冊成功，範圍為:', registration.scope);
            })
            .catch(error => {
                console.log('Service Worker 註冊失敗:', error);
            });
    });
}

// 處理 iOS 的「添加到主屏幕」彈窗
let deferredPrompt;

// 立即檢查是否已經以 PWA 模式運行
function checkIfPwaMode() {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        console.log('顯示模式: standalone (PWA 模式)');
        document.body.classList.add('pwa-mode');
        // 在 PWA 模式下可以隱藏某些 UI 元素或調整佈局
        return true;
    } else {
        console.log('顯示模式: browser');
        return false;
    }
}

// 當瀏覽器觸發 beforeinstallprompt 事件時捕捉它
window.addEventListener('beforeinstallprompt', (e) => {
    // 防止 Chrome 67 及更早版本自動顯示提示
    e.preventDefault();
    // 儲存事件，以便稍後觸發
    deferredPrompt = e;
    
    // 檢查是否應該顯示提示
    const shouldShowPrompt = !getCookie('pwaPromptDisabled') && 
                            !getCookie('pwaInstalled') && 
                            !checkIfPwaMode();
    
    // 如果使用者之前沒有選擇"不再顯示"，才顯示提示
    if (isMobile() && shouldShowPrompt) {
        // 如果過去 30 天內未顯示過提示，則顯示
        const lastPrompt = getCookie('lastPwaPrompt');
        const daysSinceLastPrompt = lastPrompt ? 
            (Date.now() - parseInt(lastPrompt, 10)) / (1000 * 60 * 60 * 24) : 100;
        
        if (daysSinceLastPrompt > 30) {
            setTimeout(() => {
                showCustomInstallPrompt();
            }, 10000); // 延遲 10 秒顯示，給用戶時間瀏覽網站
            
            // 記錄這次顯示的時間
            setCookie('lastPwaPrompt', Date.now().toString(), 365);
        }
    }
});

// 網頁安裝後觸發的事件
window.addEventListener('appinstalled', (evt) => {
    console.log('應用程式已安裝');
    // 清除提示
    deferredPrompt = null;
    // 設置 cookie 以防止再次提示
    setCookie('pwaInstalled', 'true', 365);
    hideInstallPrompt();
});

// 檢測用戶是從已安裝的 PWA 啟動還是從瀏覽器啟動
window.addEventListener('DOMContentLoaded', () => {
    checkIfPwaMode();
    
    // 特別針對 iOS 設備的處理，iOS 沒有 beforeinstallprompt 事件
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // 檢查是否應該顯示 iOS 提示
    const shouldShowIOSPrompt = isIOS && 
                               !window.navigator.standalone && 
                               !getCookie('pwaPromptDisabled');
    
    if (shouldShowIOSPrompt) {
        // 如果過去 30 天內未顯示過提示，則顯示
        const lastPrompt = getCookie('lastPwaPrompt');
        const daysSinceLastPrompt = lastPrompt ? 
            (Date.now() - parseInt(lastPrompt, 10)) / (1000 * 60 * 60 * 24) : 100;
        
        if (daysSinceLastPrompt > 30) {
            setTimeout(() => {
                showCustomInstallPrompt();
            }, 10000); // 延遲 10 秒顯示提示
            
            // 記錄這次顯示的時間
            setCookie('lastPwaPrompt', Date.now().toString(), 365);
        }
    }
});

// 檢測是否為移動設備
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 自訂安裝提示（主要針對 iOS）
function showCustomInstallPrompt() {
    // 如果用戶已選擇不再顯示，則不顯示提示
    if (getCookie('pwaPromptDisabled') || checkIfPwaMode()) {
        return;
    }
    
    // 檢測瀏覽器類型
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let instructionText = '';
    if (isIOS) {
        instructionText = '點擊 <strong>分享</strong> 按鈕<br>然後選擇 <strong>新增至主畫面</strong>';
    } else if (isAndroid) {
        instructionText = '點擊瀏覽器選單中的 <strong>安裝應用程式</strong>';
    } else {
        instructionText = '點擊地址欄右側的安裝按鈕';
    }
    
    // 確保提示尚未顯示
    if (document.getElementById('pwa-install-prompt')) {
        return;
    }
    
    // 創建安裝提示元素
    const promptContainer = document.createElement('div');
    promptContainer.id = 'pwa-install-prompt';
    promptContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #fff;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        border-radius: 8px;
        padding: 15px;
        width: 90%;
        max-width: 400px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
    `;
    
    promptContainer.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <img src="/assets/icon-192x192.png" style="width: 36px; height: 36px; margin-right: 10px; border-radius: 6px;" alt="Icon">
            <div>
                <h3 style="margin: 0; font-size: 16px;">安裝條碼系統</h3>
                <p style="margin: 5px 0 0; font-size: 14px;">離線使用並獲得更好的體驗</p>
            </div>
            <button id="pwa-close-prompt" style="margin-left: auto; background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
        </div>
        <p style="margin: 0 0 15px; font-size: 14px; line-height: 1.5;">${instructionText}</p>
        ${!isIOS ? `<button id="pwa-install-button" style="background-color: #4285F4; color: white; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; cursor: pointer; margin-bottom: 10px;">立即安裝</button>` : ''}
        <div style="display: flex; align-items: center; justify-content: flex-end;">
            <label style="display: flex; align-items: center; font-size: 12px; margin-right: auto;">
                <input type="checkbox" id="pwa-never-show" style="margin-right: 5px;">
                不再顯示
            </label>
            <button id="pwa-later-button" style="background: none; border: none; font-size: 14px; color: #666; cursor: pointer;">稍後再說</button>
        </div>
    `;
    
    document.body.appendChild(promptContainer);
    
    // 關閉按鈕事件
    document.getElementById('pwa-close-prompt').addEventListener('click', () => {
        const neverShow = document.getElementById('pwa-never-show').checked;
        if (neverShow) {
            // 如果選擇不再顯示，設置永久性 cookie
            setCookie('pwaPromptDisabled', 'true', 365);
        } else {
            // 否則，設置暫時性 cookie，30 天內不再顯示
            setCookie('pwaPromptShown', 'true', 30);
        }
        hideInstallPrompt();
    });
    
    // 稍後再說按鈕事件
    document.getElementById('pwa-later-button').addEventListener('click', () => {
        // 7 天內不再顯示
        setCookie('pwaPromptShown', 'true', 7);
        hideInstallPrompt();
    });
    
    // 如果不是 iOS，添加安裝按鈕事件
    if (!isIOS && document.getElementById('pwa-install-button')) {
        document.getElementById('pwa-install-button').addEventListener('click', () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('用戶接受安裝');
                        setCookie('pwaInstalled', 'true', 365);
                    } else {
                        console.log('用戶拒絕安裝');
                        // 如果拒絕，7 天內不再提示
                        setCookie('pwaPromptShown', 'true', 7);
                    }
                    deferredPrompt = null;
                });
            }
            hideInstallPrompt();
        });
    }
    
    // 對於 iOS 設備，添加特別的說明和圖示
    if (isIOS) {
        // 如果是 iOS 設備，添加更詳細的說明
        const iosHelp = document.createElement('div');
        iosHelp.style.cssText = `
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #eee;
        `;
        iosHelp.innerHTML = `
            <p style="margin: 0 0 10px; font-size: 13px; color: #666;">iOS 安裝步驟：</p>
            <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #666;">
                <li>點擊底部的 <strong>分享</strong> 圖標</li>
                <li>在彈出的選單中找到並點擊 <strong>加入主畫面</strong></li>
                <li>在確認視窗中點擊 <strong>新增</strong></li>
            </ol>
        `;
        promptContainer.appendChild(iosHelp);
    }
}

// 隱藏安裝提示
function hideInstallPrompt() {
    const prompt = document.getElementById('pwa-install-prompt');
    if (prompt) {
        prompt.style.opacity = '0';
        prompt.style.transform = 'translateX(-50%) translateY(20px)';
        prompt.style.transition = 'opacity 0.3s, transform 0.3s';
        
        setTimeout(() => {
            prompt.remove();
        }, 300);
    }
}

// Cookie 工具函數
function setCookie(name, value, days) {
    let expires = '';
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/; SameSite=Lax';
}

function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// 處理網絡狀態變化
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

function updateNetworkStatus() {
    const isOnline = navigator.onLine;
    
    // 更新 UI 或進行相應處理
    if (!isOnline) {
        console.log('離線模式');
        // 可以顯示離線狀態提示
        showOfflineNotification();
    } else {
        console.log('在線模式');
        // 隱藏離線狀態提示
        hideOfflineNotification();
        
        // 檢查並嘗試同步資料
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                registration.sync.register('sync-barcodes')
                    .then(() => {
                        console.log('已註冊資料同步');
                    })
                    .catch(err => {
                        console.log('資料同步註冊失敗:', err);
                    });
            });
        }
    }
}

// 顯示離線通知
function showOfflineNotification() {
    // 避免重複顯示
    if (document.getElementById('offline-notification')) return;
    
    const notification = document.createElement('div');
    notification.id = 'offline-notification';
    notification.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: #ff9800;
        color: white;
        text-align: center;
        padding: 8px;
        font-size: 14px;
        z-index: 9999;
    `;
    notification.textContent = '您目前處於離線狀態，部分功能可能無法使用';
    document.body.appendChild(notification);
}

// 隱藏離線通知
function hideOfflineNotification() {
    const notification = document.getElementById('offline-notification');
    if (notification) {
        notification.remove();
    }
}

// 初始檢查網絡狀態
updateNetworkStatus(); 