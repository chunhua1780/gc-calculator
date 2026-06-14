// GhostChat Service Worker v2
const CACHE_NAME = 'ghostchat-v2';
const VAPID_PUBLIC = 'BDQ8XlX1wbta3RwiuYkzXSnVs474RzEVomOsI9Q0j4Rc9s6ow9T2bMWr2ShMsMtIs6i4zyrOe9j78VTWh9JMsXU';

// 离线缓存的核心文件
const CACHE_URLS = [
  './index.html',
  './manifest.json',
  './icon192.png',
  './supabase-config.js',
  './webrtc.js'
];

// ─── 安装：预缓存核心资源 ───
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS))
    .catch(e => console.log('[SW] cache partial fail:', e))
  );
  self.skipWaiting();
});

// ─── 激活：清理旧缓存 ───
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── 请求拦截：网络优先，失败用缓存 ───
self.addEventListener('fetch', event => {
  // 只缓存同源的GET请求
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.origin.includes('github.io') && !url.origin.includes('localhost')) return;

  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── 推送通知接收 ───
self.addEventListener('push', event => {
  let data = { title: '●', body: '系统更新完成', icon: './icon192.png', tag: 'msg', data: {} };
  try { data = { ...data, ...event.data.json() }; } catch(e) {}

  const opts = {
    body: data.body,
    icon: data.icon || './icon192.png',
    badge: './icon192.png',
    tag: data.tag || 'ghostchat-msg',
    renotify: true,
    silent: false,
    vibrate: [100, 50, 100],
    data: data.data || {},
    // 不显示真实发件人，用隐秘文案
    actions: []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, opts)
  );
});

// ─── 点击通知：打开/聚焦应用 ───
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data.url || './index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // 如果应用已经打开，聚焦它
      for (const c of list) {
        if (c.url.includes('index.html') && 'focus' in c) return c.focus();
      }
      // 否则新开
      return clients.openWindow(targetUrl);
    })
  );
});

// ─── 后台同步（断网重连后重发） ───
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  // 通知所有页面重新拉取消息
  const list = await clients.matchAll({ type: 'window' });
  list.forEach(c => c.postMessage({ type: 'SYNC_MESSAGES' }));
}
