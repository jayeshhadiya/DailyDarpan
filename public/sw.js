// Service worker: lets quizzes opened before work without internet.
// Registered by App on the live site.
//   Pages: from the network when online (always the newest quiz); the saved copy when offline.
//   Code, styles and fonts: file names change with every build, so a saved copy is always right.
//   Monthly PDFs: from the network when online (a fixed month is never shown stale); the saved copy when offline.
//   Other files (icons, images): the saved copy at once, refreshed in the background.
// Change VERSION to throw away everything saved by an older version.
const VERSION = 'v3';
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

// `offline` is the page to show when there is neither a network nor a saved copy (pages only).
async function networkFirst(request, name, max, offline) {
  const cache = await caches.open(name);
  try {
    const response = await fetch(request);
    // 206 (part of a file) can't be saved.
    if (response.ok && response.status !== 206) {
      await cache.put(request, response.clone());
      trim(name, max);
    }
    return response;
  } catch (error) {
    const saved = await cache.match(request, { ignoreSearch: true });
    if (saved) return saved;
    if (offline) return (await caches.open(PAGES).then((pages) => pages.match(offline)));
    throw error;
  }
}

async function cacheFirst(request, refresh) {
  const cache = await caches.open(FILES);
  const saved = await cache.match(request);
  const update = fetch(request).then(async (response) => {
    if (response.ok && response.status !== 206) {
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
  // Live data (the visit counter): always from the network, never saved.
  if (sameSite && url.pathname.startsWith('/api/')) return;
  if (sameSite && url.pathname.startsWith('/pdf/')) {
    event.respondWith(networkFirst(request, FILES, 150));
  } else if (request.mode === 'navigate' && sameSite) {
    event.respondWith(networkFirst(request, PAGES, 80, OFFLINE));
  } else if (sameSite && /^\/(?:main|chunk|polyfills|styles)-[^/]+\.(?:js|css)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, false));
  } else if (url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, false));
  } else if ((sameSite && url.pathname !== '/sw.js') || url.origin === 'https://fonts.googleapis.com') {
    event.respondWith(cacheFirst(request, true));
  }
});
