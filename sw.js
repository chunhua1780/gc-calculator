const CACHE_NAME = 'ghostchat-v5';
const VAPID_PUBLIC = 'BDQ8XlX1wbta3RwiuYkzXSnVs474RzEVomOsI9Q0j4Rc9s6ow9T2bMWr2ShMsMtIs6i4zyrOe9j78VTWh9JMsXU';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── 系统级推送通知（像微信一样弹出）──
self.addEventListener('push', e => {
  let title = '新消息';
  let body = '你有一条新消息';
  let tag = 'gc-msg-' + Date.now();
  let icon = './icon192.png';

  try {
    const data = e.data.json();
    if (data.notifTitle) title = data.notifTitle;
    if (data.notifBody) body = data.notifBody;
    if (data.tag) tag = data.tag;
  } catch (err) {}

  e.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
      badge: icon,
      tag: tag,
      renotify: true,
      // 不静音，有声音有振动，像正常通知
      silent: false,
      requireInteraction: false,
      data: { url: './' }
    })
  );
});

// ── 点通知打开 App ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  var senderId = e.notification.data && e.notification.data.senderId;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('ghostchat') || c.url.includes('chunhua1780')) {
          if ('focus' in c) {
            c.focus();
            if (senderId) c.postMessage({ type: 'openChat', senderId: senderId });
            return;
          }
        }
      }
      return clients.openWindow('./' + (senderId ? '#chat=' + senderId : ''));
    })
  );
});
