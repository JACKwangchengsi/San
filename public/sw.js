/**
 * 江湖侠影录 PWA Service Worker
 * 缓存策略:
 *   - 静态资源 (JS/CSS/字体/图片): Cache-first，版本化更新
 *   - 导航/HTML: Stale-while-revalidate，即时加载 + 后台更新
 *   - API 调用: Network-first，仅在离线时回退缓存
 */

const CACHE_VERSION = 'jianghu-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// 关键资源预缓存
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
];

// ============================================================
// Install — 预缓存关键资源
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] 部分资源预缓存失败:', err.message);
      });
    })
  );
  self.skipWaiting();
});

// ============================================================
// Activate — 清理旧版本缓存
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== IMAGE_CACHE)
          .map((key) => {
            console.log('[SW] 清理旧缓存:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// ============================================================
// Fetch — 智能缓存策略路由
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') return;

  // 跳过非 HTTP(S) 请求
  if (!url.protocol.startsWith('http')) return;

  // API 调用: Network-first
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // 静态资源: Cache-first
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|jpg|webp|gif|ico)$/) ||
    url.pathname.includes('/assets/')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 图片存储 (IndexedDB images): Network-first, no cache pollution
  if (url.pathname.includes('/image/') || url.searchParams.has('image')) {
    event.respondWith(fetch(request));
    return;
  }

  // 导航 / HTML: Stale-while-revalidate
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // 默认: Network-first
  event.respondWith(networkFirst(request, STATIC_CACHE));
});

// ============================================================
// 缓存策略实现
// ============================================================

/**
 * Cache-first: 优先返回缓存，缓存未命中时请求网络并缓存
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // 导航请求离线时返回缓存的 index.html
    if (request.mode === 'navigate') {
      const cachedIndex = await caches.match('./index.html');
      if (cachedIndex) return cachedIndex;
    }
    return new Response('网络离线，请连接网络后重试。', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/**
 * Network-first: 优先请求网络，失败时回退缓存
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response('网络请求失败，且无离线缓存。', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/**
 * Stale-while-revalidate: 立即返回缓存，后台更新缓存
 */
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok && response.status === 200) {
        caches.open(cacheName).then((cache) => {
          cache.put(request, response.clone());
        });
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
