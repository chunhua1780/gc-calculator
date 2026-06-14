const CACHE_NAME = 'ghostchat-v4';
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

// ── 收到推送：显示天气通知（完全伪装成真实天气提醒）──
self.addEventListener('push', e => {
  let title = '🌡️ 天气提醒';
  let body = '注意查看今日天气预报';
  let tag = 'weather-' + new Date().toDateString();

  try {
    const data = e.data.json();
    // 服务器发来的是真实天气内容
    if(data.notifTitle) title = data.notifTitle;
    else if(data.notifSym) title = data.notifSym; // 兼容旧格式
    if(data.notifBody) body = data.notifBody;
    if(data.tag) tag = data.tag;
  } catch(err) {}

  e.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      // 用天气图标（需要准备一个天气样式图标）
      icon: './icon192.png',
      badge: './icon192.png',
      tag: tag,
      renotify: true,
      // 静音（天气提醒不需要声音，更自然）
      silent: true,
      vibrate: [],
      requireInteraction: false,
      data: { url: './index.html' }
    })
  );
});

// ── 点通知：打开 App ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
      for(const c of list){
        if(c.url.includes('ghostchat') && 'focus' in c) return c.focus();
      }
      return clients.openWindow('./index.html');
    })
  );
});

// ── 后台同步 ──
self.addEventListener('sync', e => {
  if(e.tag === 'sync-messages'){
    e.waitUntil(
      clients.matchAll({type:'window'}).then(list => {
        list.forEach(c => c.postMessage({type:'SYNC_MESSAGES'}));
      })
    );
  }
});
