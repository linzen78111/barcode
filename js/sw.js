const CACHE_NAME = 'barcode-system-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/config.js',
    '/manifest.json',
    '/assets/icon-192x192.png',
    '/assets/icon-512x512.png'
];

// 不需要快取的 URL 模式
const NO_CACHE_PATTERNS = [
    /\/__\/auth\//,
    /\/auth\//,
    /googleapis\.com/,
    /firebase\.com/,
    /accounts\.google\.com/
];

// 安裝 Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

// 激活 Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 攔截請求
self.addEventListener('fetch', event => {
    // 檢查是否需要跳過快取
    const shouldSkipCache = NO_CACHE_PATTERNS.some(pattern => 
        pattern.test(event.request.url)
    );

    if (shouldSkipCache) {
        // 對於登入相關的請求，直接使用網路請求
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
}); 