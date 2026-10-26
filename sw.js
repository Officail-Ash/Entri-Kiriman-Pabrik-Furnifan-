"use strict";

const CACHE_NAME = "furnifan-catatan-kiriman-pwa-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png?v=2",
  "./icon-512.png?v=2"
];

/* MEMASANG SERVICE WORKER BARU */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

/* MENGAKTIFKAN VERSI BARU DAN MEMBERSIHKAN CACHE LAMA */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) =>
              name.startsWith("furnifan-catatan-kiriman-pwa-") &&
              name !== CACHE_NAME
            )
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* MEMUAT HALAMAN DAN FILE PENDUKUNG */
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Hanya mengelola file dari origin GitHub Pages ini.
  // Permintaan Google Apps Script tidak di-cache.
  if (url.origin !== self.location.origin) return;

  // Navigasi: utamakan versi terbaru dari jaringan.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, copy))
              .catch((error) =>
                console.warn("Cache halaman gagal:", error)
              );
          }

          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);

          if (cached) return cached;

          const fallback = await caches.match("./index.html");

          if (fallback) return fallback;

          return new Response(
            "Koneksi internet tidak tersedia. Silakan coba kembali.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            }
          );
        })
    );

    return;
  }

  // File pendukung: gunakan cache, lalu perbarui dari jaringan.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);

      const networkRequest = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, copy))
              .catch((error) =>
                console.warn("Pembaruan cache gagal:", error)
              );
          }

          return response;
        });

      return cached || networkRequest;
    })()
  );
});
