const CACHE_NAME = "konek-t-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./firebase-config.js",
  "./manifest.webmanifest"
];

// Installation & mise en cache des éléments statiques
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation & nettoyage des anciens caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interception des requêtes avec stratégie Cache-First puis Network
self.addEventListener("fetch", (e) => {
  // Ignorer les requêtes Firebase (Firestore / Auth)
  if (e.request.url.includes("firestore.googleapis.com") ||
      e.request.url.includes("identitytoolkit.googleapis.com") ||
      e.request.url.includes("securetoken.googleapis.com")) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
