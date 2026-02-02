const CACHE_NAME = 'nagoya-trip-v2'; // 改個版號確保更新

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  // 加入 CSS 框架
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 安裝：嘗試快取，但如果單一檔案失敗不影響整體 (容錯機制)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 這裡改用個別抓取，避免一個失敗全盤崩潰
      for (const url of ASSETS_TO_CACHE) {
        try {
          await cache.add(url);
        } catch (error) {
          console.error('快取失敗，跳過:', url, error);
        }
      }
    })
  );
  self.skipWaiting();
});

// 啟動：刪除舊快取
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

// 抓取：有快取讀快取，沒快取上網抓
self.addEventListener('fetch', (event) => {
  // 忽略 API 和非 GET 請求
  if (event.request.method !== 'GET' || event.request.url.includes('api.open-meteo.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((response) => {
          // 只快取有效的回應
          if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // 離線且沒快取時，默默失敗，不顯示恐龍
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
