// Service worker: lets quizzes opened before work without internet.
// Registered by App on the live site.
//   Pages: from the network when online (always the newest quiz); the saved copy when offline.
//   Code, styles and fonts: file names change with every build, so a saved copy is always right.
//   Other files (icons, images, PDFs): the saved copy at once, refreshed in the background.
// Change VERSION to throw away everything saved by an older version.
const VERSION = 'v1';
const PAGES = `pages-${VERSION}`;
const FILES = `files-${VERSION}`;
const OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES).then((cache) => cache.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== PAGES && key !== FILES).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Keeps a cache from growing without end by dropping its oldest entries.
async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      trim(PAGES, 80);
    }
    return response;
  } catch {
    return (await cache.match(request, { ignoreSearch: true })) ?? (await cache.match(OFFLINE));
  }
}

async function cacheFirst(request, refresh) {
  const cache = await caches.open(FILES);
  const saved = await cache.match(request);
  const update = fetch(request).then(async (response) => {
    if (response.ok) {
      await cache.put(request, response.clone());
      trim(FILES, 150);
    }
    return response;
  });
  if (saved) {
    if (refresh) update.catch(() => {});
    return saved;
  }
  return update;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameSite = url.origin === self.location.origin;
  if (request.mode === 'navigate' && sameSite) {
    event.respondWith(networkFirst(request));
  } else if (sameSite && /^\/(?:main|chunk|polyfills|styles)-[^/]+\.(?:js|css)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, false));
  } else if (url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, false));
  } else if ((sameSite && url.pathname !== '/sw.js') || url.origin === 'https://fonts.googleapis.com') {
    event.respondWith(cacheFirst(request, true));
  }
});
