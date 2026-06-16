// GhostChat Service Worker v1.10
// 处理推送通知点击：静默直接打开PWA聊天界面，无任何弹窗

const PWA_URL = 'https://chunhua1780.github.io/ghostchat/';

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

// ★ 核心：拦截通知点击，静默打开PWA
// 无论是 OneSignal 还是自建 Web Push，都在这里处理
self.addEventListener('notificationclick', function(e) {
  e.notification.close();

  // 从通知的data或action中提取目标URL
  var targetUrl = PWA_URL;
  if (e.notification.data) {
    if (e.notification.data.url) targetUrl = e.notification.data.url;
    if (e.notification.data.additionalData && e.notification.data.additionalData.url) {
      targetUrl = e.notification.data.additionalData.url;
    }
  }
  // OneSignal 通知的 url 字段在 launchURL
  if (e.notification.launchURL) targetUrl = e.notification.launchURL;

  console.log('[SW] 通知点击，目标URL:', targetUrl);

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clients) {
        // 找已打开的GhostChat PWA窗口
        for (var i = 0; i < clients.length; i++) {
          var c = clients[i];
          if (c.url.indexOf('chunhua1780.github.io/ghostchat') >= 0 && 'focus' in c) {
            // PWA已打开：发消息让它跳转到对应聊天
            c.postMessage({ type: 'deeplink', url: targetUrl });
            return c.focus();
          }
        }
        // PWA未打开：直接打开目标URL
        // iOS会识别这是已安装的PWA并在App中打开（无弹窗，无提示）
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Web Push 接收（Supabase Edge Function发来的push）
self.addEventListener('push', function(e) {
  if (!e.data) return;
  var data = {};
  try { data = e.data.json(); } catch(err) { data = { title: '💬 新消息', body: e.data.text() }; }

  var options = {
    body: data.body || '你收到了一条新消息',
    icon: './icon192.png',
    badge: './icon192.png',
    tag: data.tag || 'gc-msg',
    renotify: true,
    silent: false,          // 有声音提醒用户
    requireInteraction: false,
    data: { url: data.url || PWA_URL }
  };

  e.waitUntil(
    self.registration.showNotification(data.title || '💬 GhostChat', options)
  );
});
