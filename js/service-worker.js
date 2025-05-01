const CACHE_NAME = 'barcode-app-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './offline.html',
  './css/style.css',
  './js/app.js',
  './js/auth.js',
  './js/barcodeService.js',
  './js/config.js',
  './js/custom-confirm.js',
  './js/local-manager.js',
  './assets/google-icon.svg',
  './assets/icon-192x192.png',
  './assets/icon-512x512.png'
];

// 安裝 Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: 快取資源中');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// 啟用 Service Worker
self.addEventListener('activate', event => {
  const currentCaches = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// 攔截請求，提供離線訪問能力
self.addEventListener('fetch', event => {
  // 跳過不支援的請求類型，例如 chrome-extension://
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // 對於 Firebase Auth 和 API 請求，使用 network-first 策略
  if (event.request.url.includes('googleapis.com') || 
      event.request.url.includes('firestore')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // 如果找到緩存的響應，直接返回
          return cachedResponse;
        }

        // 如果緩存中沒有，嘗試從網絡獲取
        return fetch(event.request)
          .then(response => {
            // 如果響應不正確，直接返回
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 複製響應，因為響應流只能被使用一次
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                // 將新請求的資源放入緩存
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.log('Fetch 失敗:', error);
            // 如果網絡請求失敗，顯示離線頁面
            return caches.match('./offline.html');
          });
      })
  );
}); 