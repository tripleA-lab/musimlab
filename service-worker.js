/*************************************************
 * Musim Lab — Service Worker (PWA)
 * 
 * Fungsi:
 * 1. Cache aset untuk offline access
 * 2. Handle PWA install prompt
 *************************************************/

const CACHE_NAME = "musimlab-v1";
const CACHE_URLS = [
  "/musimlab/",
  "/musimlab/index.html",
  "/musimlab/assets/favicon.svg",
  "/musimlab/assets/favicon-96x96.png",
  "/musimlab/assets/apple-touch-icon.png",
  "/musimlab/assets/web-app-manifest-192x192.png",
  "/musimlab/assets/web-app-manifest-512x512.png"
];

// ===== INSTALL: Cache aset penting =====
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching assets");
        return cache.addAll(CACHE_URLS.map(url => new Request(url, {credentials: "same-origin"})));
      })
      .catch((err) => {
        console.warn("[SW] Cache failed (some files might be missing):", err);
      })
  );
  self.skipWaiting();
});

// ===== ACTIVATE: Buang cache lama =====
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ===== FETCH: Serve dari cache, fallback ke network =====
self.addEventListener("fetch", (event) => {
  // Skip request bukan GET
  if (event.request.method !== "GET") return;

  // Skip request ke Google API (script.google.com) — biar direct
  const url = event.request.url;
  if (url.includes("script.google.com") || 
      url.includes("googleapis.com") || 
      url.includes("gstatic.com") ||
      url.includes("googletagmanager.com") ||
      url.includes("google-analytics.com")) {
    return;
  }

  // Network-first untuk HTML, cache-first untuk aset lain
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Simpan dalam cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback ke cache kalau offline
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Fallback untuk HTML
          if (event.request.mode === "navigate") {
            return caches.match("/musimlab/index.html");
          }
        });
      })
  );
});

// ===== MESSAGE: Handle messages dari page =====
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
