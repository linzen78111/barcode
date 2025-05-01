const CACHE_NAME = 'barcode-app-v1';
const CACHE_FILES = [
  '/barcode/',
  '/barcode/index.html',
  '/barcode/css/style.css',
  '/barcode/js/app.js',
  '/barcode/js/auth.js',
  '/barcode/js/barcodeService.js',
  '/barcode/js/config.js',
  '/barcode/js/custom-confirm.js',
  '/barcode/js/fix-upload.js',
  '/barcode/js/local-manager.js',
  '/barcode/js/pwa-handler.js',
  '/barcode/manifest.json',
  '/barcode/assets/google-icon.svg',
  '/barcode/assets/icons/icon-72x72.png',
  '/barcode/assets/icons/icon-96x96.png',
  '/barcode/assets/icons/icon-128x128.png',
  '/barcode/assets/icons/icon-144x144.png',
  '/barcode/assets/icons/icon-152x152.png',
  '/barcode/assets/icons/icon-192x192.png',
  '/barcode/assets/icons/icon-384x384.png',
  '/barcode/assets/icons/icon-512x512.png',
  '/barcode/SystemMessage_warning1.wav',
  '/barcode/SystemMessage_warning2.wav',
  '/barcode/ERROR.WAV',
  '/barcode/SystemProcessing.bmp',
  '/barcode/offline.html'
];

// 安裝 Service Worker 並緩存初始檔案
self.addEventListener('install', (event) => {
  console.log('Service Worker 安裝中...');
  
  // 等待緩存初始資源完成
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('緩存應用程式外殼...');
        return cache.addAll(CACHE_FILES);
      })
      .then(() => {
        console.log('緩存完成，立即接管所有頁面');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('緩存應用程式外殼失敗:', error);
      })
  );
});

// 啟用 Service Worker 並清理舊緩存
self.addEventListener('activate', (event) => {
  console.log('Service Worker 啟用中...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('清理舊緩存:', cacheName);
              return caches.delete(cacheName);
            }
            return null;
          })
        );
      })
      .then(() => {
        console.log('Service Worker 已啟用');
        return self.clients.claim();
      })
  );
});

// 攔截請求並從緩存中提供回應
self.addEventListener('fetch', (event) => {
  // 忽略 Firebase 等 API 請求
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('www.googleapis.com') ||
      event.request.url.includes('firebase')) {
    return;
  }
  
  // 使用 Cache First 策略
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 命中緩存則直接返回
        if (response) {
          return response;
        }
        
        // 未命中緩存則從網路獲取
        return fetch(event.request)
          .then((networkResponse) => {
            // 檢查是否獲得有效回應
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // 緩存新資源以便下次使用
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch((error) => {
            console.error('獲取資源失敗:', error);
            
            // 如果是 HTML 請求，則返回 offline.html
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/barcode/offline.html');
            }
            
            return new Response('離線狀態，無法獲取資源');
          });
      })
  );
});

// 接收消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 