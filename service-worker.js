const CACHE='clay-clipboard-v12';
const ASSETS=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('message', event=>{
  if(event.data && event.data.type==='SKIP_WAITING'){
    self.skipWaiting();
  }
});

self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event=>{
  if(event.request.method!=='GET') return;

  const url=new URL(event.request.url);

  // Never serve the version checker from cache.
  if(url.pathname.endsWith('/version.json')){
    event.respondWith(
      fetch(event.request, {cache:'no-store'})
        .catch(()=>new Response(JSON.stringify({version:12}), {
          headers:{'Content-Type':'application/json'}
        }))
    );
    return;
  }

  const isAppShell =
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/manifest.webmanifest');

  if(isAppShell){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          return response;
        })
        .catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      return cached || fetch(event.request).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      });
    })
  );
});
