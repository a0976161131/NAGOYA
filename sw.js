const CACHE_NAME = 'nagoya-trip-v1';

// 這裡列出第一次載入時「絕對要存下來」的資源
// 注意：圖片因為是外部連結，透過執行期間快取處理
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com', // 讓樣式離線也能跑
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Yomogi&family=Noto+Sans+TC:wght@400;500;700&swap'
];

// 1. 安裝 Service Worker 並快取核心檔案
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. 啟動並清理舊快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. 攔截請求：有快取讀快取，沒快取上網抓並存起來
self.addEventListener('fetch', (event) => {
  // 排除 API 請求 (天氣 API 讓他失敗走 fallback，不要快取錯誤)
  if (event.request.url.includes('api.open-meteo.com')) {
    return; 
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 如果快取有，直接回傳
      if (cachedResponse) {
        return cachedResponse;
      }

      // 如果快取沒有，去網路抓
      return fetch(event.request)
        .then((response) => {
          // 檢查回應是否有效
          if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors' && response.type !== 'opaque') {
            return response;
          }

          // 複製一份回應存入快取 (給圖片用)
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // 避免快取過大的檔案或不支援的格式
            try {
                cache.put(event.request, responseToCache);
            } catch (err) {}
          });

          return response;
        })
        .catch(() => {
          // 真的完全離線且沒快取時，若是請求圖片，可以回傳一個預設圖 (選用)
          // 這裡保持空白避免報錯
        });
    })
  );
});
