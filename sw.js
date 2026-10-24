// Sirli o’rmon — service worker (internetsiz ishlash uchun)
// Fayllarni o’zgartirsangiz, quyidagi raqamni oshiring (v1 -> v2).
const CACHE = "sirli-ormon-v8";
const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
const LOCAL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(LOCAL).then(function () {
        return c.add(new Request(THREE_URL, { mode: "cors" }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  // Three.js: avval keshdan
  if (u.href === THREE_URL) {
    e.respondWith(caches.match(THREE_URL).then(function (hit) { return hit || fetch(r); }));
    return;
  }
  if (u.origin !== location.origin) return;
  // O’yin fayllari: keshdan ber, orqada yangisini yuklab qo’y
  e.respondWith(
    caches.match(r, { ignoreSearch: true }).then(function (hit) {
      const net = fetch(r).then(function (res) {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(r, copy); });
        }
        return res;
      }).catch(function () {
        return hit || (r.mode === "navigate" ? caches.match("./index.html") : Response.error());
      });
      if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
      return net;
    })
  );
});
