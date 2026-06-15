const CACHE_NAME = 'ghostchat-v9';
const APP_ORIGIN = 'https://ghostchat-dun.pages.dev';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
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

// ── 推送通知 ──
self.addEventListener('push', e => {
  // 立即处理，不做任何可能失败的操作
  let title = 'GhostChat';
  let body = '你有一条新消息';
  let tag = 'gc-' + Date.now();
  let data = { url: APP_ORIGIN };

  try {
    if (e.data) {
      const d = e.data.json();
      title = d.title || title;
      body = d.body || body;
      tag = d.tag || tag;
      data = d.data || data;
    }
  } catch(err) {}

  // waitUntil确保通知显示完成
  e.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: APP_ORIGIN + '/icon192.png',
      badge: APP_ORIGIN + '/icon192.png',
      tag: tag,
      renotify: true,
      silent: false,
      requireInteraction: false,
      data: data
    })
  );
});

// ── 点通知跳转 ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const senderId = e.notification.data && e.notification.data.senderId;
  const appUrl = APP_ORIGIN + '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.startsWith(APP_ORIGIN)) {
          c.focus();
          if (senderId) c.postMessage({ type: 'openChat', senderId });
          return;
        }
      }
      return clients.openWindow(appUrl);
    })
  );
});

// ── 后台同步：App关闭时有新消息也能显示 ──
self.addEventListener('sync', e => {
  if (e.tag === 'check-messages') {
    e.waitUntil(checkNewMessages());
  }
});

async function checkNewMessages() {
  // 由主线程在有消息时触发 showNotification
}
