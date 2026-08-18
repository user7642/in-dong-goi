// sw.js — Service Worker cho tính năng Web Push (nhận thông báo cả khi tắt
// màn hình / đóng hẳn tab). Đặt file này CÙNG THƯ MỤC với index.html trên
// GitHub Pages (ví dụ: https://user7642.github.io/in-dong-goi/sw.js).
//
// Đây là code chạy NGẦM, độc lập với tab trình duyệt — trình duyệt tự đánh
// thức file này khi có push đến từ server (Cloudflare Worker), kể cả khi
// app đã đóng từ lâu.

// ---- Cache cho tài nguyên tĩnh của PWA (manifest + icon) ----
// CHỈ cache các file tĩnh phục vụ việc "cài đặt app" (manifest, icon) — KHÔNG
// cache index.html hay dữ liệu Firestore, vì app cần luôn lấy bản mới nhất
// (dữ liệu đơn hàng thay đổi liên tục). Đổi CACHE_NAME (vd v2, v3...) mỗi khi
// icon/manifest thay đổi để buộc trình duyệt lấy bản mới.
const CACHE_NAME = "in-dong-goi-static-v1";
const STATIC_ASSETS = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(e => console.warn("Cache một số asset PWA thất bại (không nghiêm trọng):", e))
  );
  self.skipWaiting(); // kích hoạt SW mới ngay, không đợi mọi tab cũ đóng lại
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      )
    )
  );
  self.clients.claim(); // SW mới điều khiển các tab đang mở ngay lập tức
});

// Chỉ can thiệp (trả lời từ cache) đúng các file tĩnh liệt kê ở trên —
// mọi request khác (HTML, Firestore, Cloudinary...) đi thẳng ra mạng như
// bình thường, SW không đụng vào.
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  const isStaticAsset = STATIC_ASSETS.some(path => url.pathname.endsWith(path.replace("./", "/")));
  if(!isStaticAsset) return;

  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      })
    )
  );
});

self.addEventListener("push", event => {
  let data = {};
  try{
    data = event.data ? event.data.json() : {};
  }catch(e){
    data = { title: "🔔 Đơn cần đóng gói", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "🔔 Đơn cần đóng gói";
  const options = {
    body: data.body || "",
    // tag: gộp nhiều push cùng lúc thành 1 thông báo duy nhất (tránh spam
    // nếu nhiều đơn cùng chuyển sang "Đóng gói" gần như đồng thời).
    tag: "in-dong-goi-bell",
    renotify: true,
    requireInteraction: true // thông báo không tự biến mất — phải bấm mới tắt
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Bấm vào thông báo -> mở lại (hoặc focus) tab app đang có sẵn.
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for(const client of clientList){
        if("focus" in client) return client.focus();
      }
      if(clients.openWindow) return clients.openWindow("./");
    })
  );
});
