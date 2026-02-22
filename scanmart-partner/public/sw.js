/**
 * ScanMart — Service Worker
 * Strategy: Cache-First for static assets, Network-First for API/Supabase
 */

const CACHE_NAME = "scanmart-shell-v1";

// Static assets to pre-cache (app shell)
const SHELL_ASSETS = [
    "/",
    "/dashboard",
    "/dashboard/sales",
    "/offline.html",
];

// ── Install: cache app shell ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Use individual requests so one failure doesn't break everything
            return Promise.allSettled(
                SHELL_ASSETS.map((url) => cache.add(url).catch(() => { }))
            );
        })
    );
    self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((k) => k !== CACHE_NAME)
                    .map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for assets ─────────────────
self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET, chrome-extension, or Supabase/API calls for caching
    if (event.request.method !== "GET") return;
    if (url.hostname.includes("supabase.co")) return;
    if (url.pathname.startsWith("/api/")) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Clone and update cache with fresh response
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return networkResponse;
            })
            .catch(() =>
                // offline fallback: serve from cache
                caches.match(event.request).then(
                    (cached) => cached || caches.match("/offline.html")
                )
            )
    );
});

// ── Message: trigger sync from app ───────────────────────────────────────
self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
