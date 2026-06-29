/* CookCapable service worker — offline app shell */
const CACHE = 'cookcapable-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './fonts/fonts.css',
  './vendor/html5-qrcode.min.js'
];
// Larger assets (fonts woff2, the Tesseract engine + language data) are cached on
// first use by the fetch handler below rather than precached on install.
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache live APIs (lookups + Supabase auth/data) — always network, fail soft.
  if (/googleapis|openlibrary|openfoodfacts|covers\.openlibrary|supabase\.co/.test(url.host)) {
    e.respondWith(fetch(req).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  // App shell + fonts/scanner: cache-first, then network, then cache fill.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
