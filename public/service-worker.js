const CACHE_NAME = `nupzia-cache-${process.env.VERCEL_TIMESTAMP || 'default'}`; // Cambiar la versión en cada despliegue
const urlsToCache = [
  '/',             // Página principal
  '/index.html',   // HTML
  '/styles.css',   // CSS (actualiza con nombres con hashes si usas Webpack/Vite)
  '/script.js',    // JS
  '/assets/logo.jpg' // Otros recursos estáticos
];

// Instalación del Service Worker: Cache Busting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache:', CACHE_NAME);
      return cache.addAll(urlsToCache);
    })
  );
});

// Interceptar solicitudes: Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      const networkResponsePromise = fetch(event.request);

      // Actualiza el caché en segundo plano
      networkResponsePromise.then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
      });

      // Devuelve el recurso en caché o espera por la respuesta de red
      return cachedResponse || networkResponsePromise;
    })
  );
});

// Activación del Service Worker: Limpieza de Cachés Antiguos
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

