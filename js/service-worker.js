const CACHE_NAME = 'barcode-app-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/style.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/barcodeService.js',
  '/js/config.js',
  '/js/custom-confirm.js',
  '/js/local-manager.js',
  '/js/fix-upload.js',
  '/assets/google-icon.svg',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png',
  '/manifest.json'
];

// 安裝 Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] 安裝中');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] 快取資源中');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] 安裝完成，強制啟用');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] 安裝失敗:', error);
      })
  );
});

// 啟用 Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] 啟用中');
  const currentCaches = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[Service Worker] 刪除舊的緩存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] 已啟用並控制頁面');
      return self.clients.claim();
    })
    .catch(error => {
      console.error('[Service Worker] 啟用失敗:', error);
    })
  );
});

// 處理 fetch 事件，提供離線訪問能力
self.addEventListener('fetch', event => {
  const request = event.request;
  
  // 跳過不支援的請求類型
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // 跳過 POST 請求
  if (request.method !== 'GET') {
    return;
  }

  // 對於 Firebase Auth 和 API 請求，直接從網絡獲取
  if (request.url.includes('googleapis.com') || 
      request.url.includes('firestore') ||
      request.url.includes('firebase')) {
    return;
  }

  // 網絡優先策略
  const networkFirst = async () => {
    try {
      // 嘗試從網絡獲取資源
      const networkResponse = await fetch(request);
      
      // 如果成功獲取，將響應複製一份放入緩存
      const cache = await caches.open(CACHE_NAME);
      if (networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (error) {
      // 如果網絡請求失敗，嘗試從緩存獲取
      const cachedResponse = await caches.match(request);
      
      // 如果緩存中有該資源，返回緩存的響應
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // 如果是頁面請求（HTML），返回離線頁面
      if (request.headers.get('Accept').includes('text/html')) {
        return caches.match('/offline.html');
      }
      
      // 其他類型的資源，如果都失敗了，返回一個簡單的錯誤響應
      return new Response('Network error occurred', {
        status: 408,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  };

  event.respondWith(networkFirst());
}); 