// PWA Handler for Barcode System
// This file is required for the announcement feature to work properly

// 檢查是否支援 serviceWorker
const isServiceWorkerSupported = 'serviceWorker' in navigator;
const isPWAInstalled = window.matchMedia('(display-mode: standalone)').matches;

// PWA 安裝處理
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  // 防止 Chrome 67 及更早版本自動顯示安裝提示
  e.preventDefault();
  // 保存事件以便稍後觸發
  deferredPrompt = e;
  
  // 可選：顯示自訂安裝按鈕
  console.log('應用可安裝，顯示安裝按鈕');
});

// PWA 安裝完成後的處理
window.addEventListener('appinstalled', (evt) => {
  console.log('應用已安裝');
});

// 檢測離線狀態
window.addEventListener('online', () => {
  console.log('已恢復連線');
  document.body.classList.remove('offline-mode');
});

window.addEventListener('offline', () => {
  console.log('已離線');
  document.body.classList.add('offline-mode');
});

// 主要 PWA 處理函數
window.pwaHandler = {
  init: function() {
    console.log('PWA handler initialized');
    
    // 檢查離線狀態
    if (!navigator.onLine) {
      document.body.classList.add('offline-mode');
    }
    
    // 註冊 Service Worker
    if (isServiceWorkerSupported) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('Service Worker 已註冊', reg);
          
          // 檢查更新
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('有新版本可用');
                // 這裡可以通知用戶重新整理頁面
              }
            });
          });
        })
        .catch(err => console.error('Service Worker 註冊失敗:', err));
    }
    
    return Promise.resolve();
  },
  
  // 讓應用程式強制更新內容
  refreshContent: function() {
    if (isServiceWorkerSupported && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    return Promise.resolve();
  },
  
  // 顯示安裝提示
  showInstallPrompt: function() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('用戶接受安裝');
        } else {
          console.log('用戶拒絕安裝');
        }
        deferredPrompt = null;
      });
    }
  },
  
  // 檢查是否已安裝
  isPWAInstalled: function() {
    return isPWAInstalled;
  }
}; 