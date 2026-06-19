// GhostChat Android SW v1.0
// Android原生Web Push，点通知直接打开PWA聊天
const PWA_URL = './';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(e) {
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).catch(function() {
      return caches.match('./index.html');
    })
  );
});

// ★ 接收Web Push（Supabase Edge Function发来的push）
self.addEventListener('push', function(e) {
  if (!e.data) return;
  var data = {};
  try { data = e.data.json(); } catch(err) {
    data = { title: '💬 新消息', body: e.data.text() };
  }

  var fromId = data.fromId || (data.url && new URL(data.url).hash.match(/from=([^&]+)/)?.[1]) || '';

  var options = {
    body: data.body || '你收到了一条新消息',
    icon: './icon192.png',
    badge: './icon192.png',
    tag: 'gc-msg-' + (fromId || Date.now()),
    renotify: true,
    silent: false,
    requireInteraction: false,
    // Android：data里放fromId，点击通知时用来跳转聊天
    data: {
      url: data.url || PWA_URL,
      fromId: fromId
    }
  };

  e.waitUntil(
    self.registration.showNotification(data.title || '💬 GhostChat', options)
  );
});

// ★ 核心：拦截通知点击，直接打开PWA并跳转到对应聊天
self.addEventListener('notificationclick', function(e) {
  e.notification.close();

  var notifData = e.notification.data || {};
  var targetUrl = notifData.url || PWA_URL;
  var fromId = notifData.fromId || '';

  console.log('[SW Android] 通知点击, fromId:', fromId, 'url:', targetUrl);

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clients) {
        // 找已打开的PWA窗口
        for (var i = 0; i < clients.length; i++) {
          var c = clients[i];
          if ('focus' in c) {
            // PWA已打开：发消息让它跳转到对应聊天
            if (fromId) {
              c.postMessage({ type: 'deeplink', url: targetUrl, fromId: fromId });
            }
            return c.focus();
          }
        }
        // PWA未打开：直接打开
        // Android Chrome会自动在standalone模式中打开已安装的PWA
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// 后台消息同步（可选）
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
