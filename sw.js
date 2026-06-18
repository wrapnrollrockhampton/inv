// Wrap&Roll Rockhampton — Service Worker
// Minimal cache strategy: cache the app shell, always go to network for API calls
var CACHE_NAME = 'wraproll-v27';
var APP_SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo.png'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE_NAME;}).map(function(k){return caches.delete(k);}));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  var url = new URL(e.request.url);
  // Never cache API calls (Apps Script) — always fetch fresh
  if(url.hostname.indexOf('script.google.com')>-1 || url.hostname.indexOf('googleusercontent.com')>-1){
    e.respondWith(fetch(e.request));
    return;
  }
  // App shell: cache-first, fallback to network
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request);
    })
  );
});
