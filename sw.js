/* Rebelz Admin + Store app — service worker
   - Only the Admin and Store pages (and their files) are saved on the phone.
   - Bartender, client and menu pages are NOT touched: they always load live from the link.
   - Firebase data / login traffic is never cached.
   - Pages are "network first": when there is signal, the latest version from GitHub loads.
     With weak or no signal, the saved copy opens after a few seconds. */

const VERSION = 'rebelz-app-v5';
const PAGE_CACHE = VERSION + '-pages';
const LIB_CACHE = VERSION + '-libs';

const APP_PAGES = ['/admin.html', '/store.html'];
const PRECACHE = [
  '/admin.html',
  '/store.html',
  '/manifest-admin.json',
  '/manifest-store.json',
  '/rebelz%20bartending%20logo.png',
  '/rbz-icon-admin-192.png',
  '/rbz-icon-store-192.png',
  '/rbz-icon-favicon-32.png',
  '/pwa-install.js'
];

// Outside libraries that are safe to keep on the phone (fonts, Excel/PDF libs, Firebase JS files)
const LIB_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'www.gstatic.com'
];

const NETWORK_WAIT_MS = 4000; // weak signal: fall back to saved copy after 4 seconds

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PAGE_CACHE)
      .then(c => Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isAppPage(url) {
  return url.origin === self.location.origin && APP_PAGES.includes(url.pathname);
}
function isOwnAsset(url) {
  if (url.origin !== self.location.origin) return false;
  const p = url.pathname;
  return p.startsWith('/manifest-') || p === '/pwa-install.js' || p.endsWith('.png');
}
function isLib(url) {
  if (!LIB_HOSTS.includes(url.hostname)) return false;
  // never cache anything from gstatic except the Firebase JS library files
  if (url.hostname === 'www.gstatic.com') return url.pathname.startsWith('/firebasejs/');
  return true;
}

// Network first, with a timeout; saved copy if the network is slow or down
async function networkFirst(request, cacheKey) {
  const cache = await caches.open(PAGE_CACHE);
  const fromNet = fetch(request).then(res => {
    if (res && res.ok) cache.put(cacheKey, res.clone());
    return res;
  });
  const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_WAIT_MS));
  const quick = await Promise.race([fromNet.catch(() => null), timeout]);
  if (quick) return quick;
  const saved = await cache.match(cacheKey);
  if (saved) return saved;
  return fromNet; // nothing saved yet: keep waiting for the network
}

// Saved copy first, refresh in the background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const saved = await cache.match(request);
  const fromNet = fetch(request).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return saved || (await fromNet) || Response.error();
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (isAppPage(url)) {
    // ?app=admin etc. all share one saved copy
    event.respondWith(networkFirst(req, url.origin + url.pathname));
    return;
  }
  if (isOwnAsset(url)) {
    event.respondWith(staleWhileRevalidate(req, PAGE_CACHE));
    return;
  }
  if (isLib(url)) {
    event.respondWith(staleWhileRevalidate(req, LIB_CACHE));
    return;
  }
  // Everything else (bartender, client, menu pages, Firebase data, login) goes straight to the network.
});
