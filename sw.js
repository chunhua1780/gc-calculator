const CACHE_NAME = 'ghostchat-v3';
const VAPID_PUBLIC = 'BDQ8XlX1wbta3RwiuYkzXSnVs474RzEVomOsI9Q0j4Rc9s6ow9T2bMWr2ShMsMtIs6i4zyrOe9j78VTWh9JMsXU';

const CACHE_URLS = ['./index.html','./manifest.json','./icon192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CACHE_URLS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if(e.request.method!=='GET') return;
  e.respondWith(
    fetch(e.request).then(res=>{
      const clone=res.clone();
      caches.open(CACHE_NAME).then(c=>c.put(e.request,clone));
      return res;
    }).catch(()=>caches.match(e.request))
  );
});

// ─── 收到推送：只显示标点符号 ───
self.addEventListener('push', e => {
  let data = { title:'，', body:'，', icon:'./icon192.png' };
  try { data = { ...data, ...e.data.json() }; } catch(err) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: '',           // body留空，只显示标点符号作为标题
      icon: data.icon,
      badge: './icon192.png',
      tag: data.tag || 'gc',
      renotify: true,
      silent: false,
      vibrate: [100, 50, 100],
      data: data.data || {}
    })
  );
});

// ─── 点通知：打开App ───
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const c of list){
        if(c.url.includes('ghostchat')&&'focus' in c) return c.focus();
      }
      return clients.openWindow('./index.html');
    })
  );
});

self.addEventListener('sync', e => {
  if(e.tag==='sync-messages'){
    e.waitUntil(clients.matchAll({type:'window'}).then(list=>{
      list.forEach(c=>c.postMessage({type:'SYNC_MESSAGES'}));
    }));
  }
});
