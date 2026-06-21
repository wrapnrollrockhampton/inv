// Wrap&Roll Rockhampton — Service Worker v58
// Auto-update strategy: SW activates immediately, reloads clients on update
var CACHE_NAME = 'wraproll-v68';
var APP_SHELL = ['./index.html','./manifest.json','./logo.png'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    })
  );
  // Take over immediately — don't wait for old SW to die
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){return k!==CACHE_NAME;})
            .map(function(k){return caches.delete(k);})
      );
    }).then(function(){
      // Claim all clients so new SW controls them right away
      return self.clients.claim();
    }).then(function(){
      // Tell all open tabs to reload so they get the new version
      return self.clients.matchAll({type:'window'}).then(function(clients){
        clients.forEach(function(c){ c.postMessage({type:'SW_UPDATED',version:CACHE_NAME}); });
      });
    })
  );
});

self.addEventListener('fetch', function(e){
  var url = new URL(e.request.url);

  // Never cache API calls
  if(url.hostname.indexOf('script.google.com')>-1 ||
     url.hostname.indexOf('googleusercontent.com')>-1){
    e.respondWith(fetch(e.request).catch(function(){
      return new Response('{"ok":false,"msg":"Offline"}',{headers:{'Content-Type':'application/json'}});
    }));
    return;
  }

  // index.html — network-first so users always get the latest version
  // Falls back to cache if offline
  if(url.pathname.endsWith('/') || url.pathname.endsWith('index.html')){
    e.respondWith(
      fetch(e.request).then(function(resp){
        // Update cache with fresh copy
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(e.request, clone); });
        return resp;
      }).catch(function(){
        return caches.match(e.request);
      })
    );
    return;
  }

  // Other assets — cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(resp){
        var clone=resp.clone();
        caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,clone);});
        return resp;
      });
    })
  );
});

// Allow app to trigger skipWaiting manually
self.addEventListener('message', function(e){
  if(e.data&&e.data.type==='SKIP_WAITING') self.skipWaiting();
});
