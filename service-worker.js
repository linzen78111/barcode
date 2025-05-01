const CACHE_NAME = 'barcode-system-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './offline.html',
  './css/style.css',
  './css/pwa.css',
  './js/app.js',
  './js/auth.js',
  './js/barcodeService.js',
  './js/config.js',
  './js/custom-confirm.js',
  './js/local-manager.js',
  './js/pwa.js',
  './assets/icon-192x192.png',
  './assets/icon-512x512.png',
  './manifest.json',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-analytics.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js',
  'https://unpkg.com/html5-qrcode'
];

// 安裝Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// 啟用Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 攔截請求和回應
self.addEventListener('fetch', (event) => {
  // 檢查資源是否來自外部網域
  const isExternalResource = !event.request.url.startsWith(self.location.origin);
  
  // 如果是外部資源，使用網路優先策略
  if (isExternalResource) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // 如果無法從網路獲取，嘗試從快取中取得
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // 對於HTML請求，使用網路優先策略，如果失敗則回傳離線頁面
  if (event.request.mode === 'navigate' || 
      (event.request.method === 'GET' && 
       event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // 網路請求失敗時，回傳離線頁面
          return caches.match('./offline.html');
        })
    );
    return;
  }
  
  // 對於其他本地資源，使用快取優先策略
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 如果在快取中找到匹配的回應，回傳它
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // 否則，發送網路請求
        return fetch(event.request)
          .then((networkResponse) => {
            // 如果獲得有效回應，則可以考慮快取它
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // 需要複製回應物件，因為它是一個串流，只能使用一次
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          });
      })
  );
});

// 處理推送通知
self.addEventListener('push', (event) => {
  if (event.data) {
    const notification = event.data.json();
    
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: './assets/icon-192x192.png',
      badge: './assets/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        url: notification.url || './'
      }
    });
  }
});

// 點擊通知時的行為
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (let client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
    );
  }
}); 