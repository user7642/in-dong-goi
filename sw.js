// sw.js — Service Worker cho tính năng Web Push (nhận thông báo cả khi tắt
// màn hình / đóng hẳn tab). Đặt file này CÙNG THƯ MỤC với index.html trên
// GitHub Pages (ví dụ: https://user7642.github.io/in-dong-goi/sw.js).
//
// Đây là code chạy NGẦM, độc lập với tab trình duyệt — trình duyệt tự đánh
// thức file này khi có push đến từ server (Cloudflare Worker), kể cả khi
// app đã đóng từ lâu.

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
