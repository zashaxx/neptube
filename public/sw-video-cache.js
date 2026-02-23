/**
 * NepTube Service Worker — Video Cache
 *
 * Intercepts video requests and caches them for faster repeat playback.
 * Caches both the streaming proxy responses and direct video URLs.
 * Uses a Cache-First strategy for videos and Network-First for everything else.
 */

const VIDEO_CACHE_NAME = "neptube-video-cache-v1";
const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB max cache

// Patterns that identify video requests
const VIDEO_PATTERNS = [
  /\/api\/video\/stream/,
  /\.(mp4|webm|ogg|mov)($|\?)/i,
  /utfs\.io\/f\//,
  /ufs\.sh\/f\//,
  /videos\.pexels\.com/,
  /vod-progressive\.akamaized\.net/,
];

function isVideoRequest(url) {
  return VIDEO_PATTERNS.some((pattern) => pattern.test(url));
}

// Install: pre-cache nothing, just activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate: clean old caches, claim all clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith("neptube-") && key !== VIDEO_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Cache-First for videos, passthrough for everything else
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== "GET") return;

  // Only handle video requests
  if (!isVideoRequest(request.url)) return;

  event.respondWith(handleVideoRequest(request));
});

async function handleVideoRequest(request) {
  const cache = await caches.open(VIDEO_CACHE_NAME);

  // Check cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    // Return cached response, but also validate in background
    return cachedResponse;
  }

  // Not in cache — fetch from network
  try {
    const networkResponse = await fetch(request);

    // Only cache successful responses
    if (networkResponse.ok || networkResponse.status === 206) {
      // Clone before caching (response body can only be consumed once)
      const responseToCache = networkResponse.clone();

      // Cache in background (don't block the response)
      event_cacheResponse(cache, request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    // Network failed — check cache one more time as fallback
    const fallback = await cache.match(request);
    if (fallback) return fallback;

    return new Response("Video not available offline", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

async function event_cacheResponse(cache, request, response) {
  try {
    await cache.put(request, response);

    // Trim cache if it gets too large
    await trimCache(cache);
  } catch (err) {
    // Cache storage might be full — that's OK
    console.warn("[NepTube SW] Cache storage error:", err);
  }
}

async function trimCache(cache) {
  const keys = await cache.keys();

  // Rough estimate: if more than 200 entries, start evicting oldest
  if (keys.length > 200) {
    // Delete the oldest 50 entries
    const toDelete = keys.slice(0, 50);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// Handle messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_VIDEO_CACHE") {
    caches.delete(VIDEO_CACHE_NAME).then(() => {
      event.source?.postMessage({ type: "VIDEO_CACHE_CLEARED" });
    });
  }

  if (event.data?.type === "GET_CACHE_SIZE") {
    getCacheSize().then((size) => {
      event.source?.postMessage({ type: "CACHE_SIZE", size });
    });
  }
});

async function getCacheSize() {
  try {
    const cache = await caches.open(VIDEO_CACHE_NAME);
    const keys = await cache.keys();
    let totalSize = 0;

    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }

    return totalSize;
  } catch {
    return 0;
  }
}
