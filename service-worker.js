// 版本號，當資源更新時需要更改此版本號
const CACHE_VERSION = 'v4';
const CACHE_NAME = `barcode-system-${CACHE_VERSION}`;

// 需要快取的資源列表
const CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/auth.js',
  './js/auth-pwa.js',
  './js/pwa-init.js',
  './js/pwa-handler.js',
  './js/barcodeService.js',
  './js/config.js',
  './js/custom-confirm.js',
  './js/local-manager.js',
  './offline.html',
  // 圖示
  './assets/icon-192x192.png',
  './assets/icon-512x512.png',
  './assets/google-icon.svg',
  // 音效
  './SystemMessage_warning1.wav',
  './SystemMessage_warning2.wav',
  './ERROR.WAV',
  // 第三方資源
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-analytics.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js',
  'https://unpkg.com/html5-qrcode'
];

// 不快取的網址或路徑模式
const EXCLUDE_FROM_CACHE = [
  'firebaseauth',
  'accounts.google.com',
  'apis.google.com',
  'identitytoolkit',
  'securetoken.googleapis.com',
  'googleapis.com',
  'google.com',
  'googleusercontent.com',
  'id.google.com',
  'oauth',
  'token',
  'signin',
  'login'
];

// 安裝 Service Worker 並快取資源
self.addEventListener('install', event => {
  console.log('[Service Worker] 安裝中');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] 快取資源中');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] 略過等待');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] 安裝失敗:', error);
      })
  );
});

// 當新版本的 Service Worker 激活時，清除舊的快取
self.addEventListener('activate', event => {
  console.log('[Service Worker] 激活中');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] 已取得控制權');
      return self.clients.claim();
    }).catch(error => {
      console.error('[Service Worker] 激活失敗:', error);
    })
  );
});

// 檢查 URL 是否應該從快取中排除
function shouldExcludeFromCache(url) {
  if (url.includes('?') && url.includes('source=pwa')) {
    return false; // 允許 PWA 特定參數的請求被快取
  }
  return EXCLUDE_FROM_CACHE.some(pattern => url.includes(pattern));
}

// 檢查是否為認證相關請求
function isAuthRequest(url) {
  const authPatterns = [
    'google.com/signin', 
    'accounts.google', 
    'oauth', 
    'token', 
    'login',
    'signin',
    'firebaseauth'
  ];
  return authPatterns.some(pattern => url.includes(pattern));
}

// 處理網頁請求
self.addEventListener('fetch', event => {
  // 跳過不支援的請求
  if (!event.request.url.startsWith('http')) return;
  
  // 特殊處理 about:blank 相關請求，這可能是 Firebase 認證彈窗引起的
  if (event.request.url.includes('about:blank') || event.request.url.includes('blank')) {
    console.log('[Service Worker] 處理 about:blank 相關請求，不進行攔截');
    return;
  }
  
  // 處理 Google 登入和 Firebase 相關請求，這些應該直接使用網絡
  if (shouldExcludeFromCache(event.request.url)) {
    // 認證相關請求直接走網絡，不做任何快取
    if (isAuthRequest(event.request.url)) {
      console.log('[Service Worker] 認證請求，直接使用網絡:', event.request.url);
      // 認證請求不做任何攔截，直接放行
      return;
    }
    
    // 其他排除快取的請求，嘗試走網絡，失敗則走快取
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // 處理一般請求，採用快取優先策略
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果在快取中找到了請求的資源，則直接返回快取中的資源
        if (response) {
          console.log('[Service Worker] 返回快取資源:', event.request.url);
          return response;
        }
        
        // 如果快取中沒有，則向網絡請求
        console.log('[Service Worker] 從網絡獲取資源:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // 如果獲取成功，則將新資源複製一份並加入快取
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' || shouldExcludeFromCache(event.request.url)) {
              return networkResponse;
            }
            
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                console.log('[Service Worker] 快取新資源:', event.request.url);
                cache.put(event.request, responseToCache);
              })
              .catch(err => {
                console.error('[Service Worker] 快取資源失敗:', err);
              });
              
            return networkResponse;
          })
          .catch(error => {
            console.log('[Service Worker] 獲取資源失敗:', error);
            
            // 檢查請求類型
            const acceptHeader = event.request.headers.get('accept');
            
            // 如果獲取失敗且請求的是圖片，則返回預設圖片
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|bmp|svg)$/i) || 
                (acceptHeader && acceptHeader.includes('image/'))) {
              return caches.match('./assets/icon-192x192.png');
            }
            
            // 對於 HTML 文件，返回離線頁面
            if (acceptHeader && acceptHeader.includes('text/html')) {
              return caches.match('./offline.html');
            }
            
            // 對於其他類型的資源，返回一個錯誤響應
            return new Response('Network error', { 
              status: 408, 
              headers: new Headers({ 'Content-Type': 'text/plain' }) 
            });
          });
      })
  );
});

// 處理推送通知
self.addEventListener('push', event => {
  console.log('[Service Worker] 收到推送通知');
  
  const title = '條碼系統';
  const options = {
    body: event.data ? event.data.text() : '有新通知',
    icon: './assets/icon-192x192.png',
    badge: './assets/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      { action: 'explore', title: '查看通知' },
      { action: 'close', title: '忽略' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 處理通知點擊
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] 點擊通知:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.openWindow('./?source=pwa')
      .then(windowClient => windowClient ? windowClient.focus() : null)
  );
});

// 監聽 message 事件，接收來自主 app 的消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_VERSION
    });
  }
});

// 處理同步事件（用於後台資料同步）
self.addEventListener('sync', event => {
  if (event.tag === 'sync-barcodes') {
    console.log('[Service Worker] 同步條碼資料');
    event.waitUntil(syncBarcodes());
  }
});

// 模擬後台資料同步功能
function syncBarcodes() {
  return new Promise((resolve, reject) => {
    // 在這裡實現與伺服器的同步邏輯
    console.log('[Service Worker] 條碼資料同步完成');
    resolve();
  });
} 