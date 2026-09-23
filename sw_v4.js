const CACHE_NAME = 'barrault-coaching-v4';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        urlsToCache.map((url) =>
          fetch(url)
            .then((response) => {
              if (response.ok) {
                return cache.put(url, response);
              }
              console.warn('[SW] Fichier non mis en cache (introuvable) :', url);
            })
            .catch((err) => console.warn('[SW] Erreur cache pour', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// MODIFICATION : stratégie "réseau d'abord, cache en secours"
// -> évite qu'une erreur réseau ponctuelle (4G faible, coupure) ne bloque
// l'app en la figeant sur une mauvaise réponse mise en cache.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Si la réponse réseau est valide, on met à jour le cache
        // et on la renvoie directement (données toujours fraîches).
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        }
        // Si le réseau répond mais avec une erreur (404, 500...),
        // on tente le cache plutôt que d'afficher l'erreur.
        return caches.match(event.request).then((cached) => cached || networkResponse);
      })
      .catch(() => {
        // Réseau totalement indisponible (vrai mode hors-ligne)
        // -> on utilise le cache comme dernier recours.
        return caches.match(event.request);
      })
  );
});
