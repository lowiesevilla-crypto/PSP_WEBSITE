const CACHE_NAME = "psp-public-shell-v2";
const SHELL_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/brand/psp-logo.jpg",
  "/icons/icon.svg",
];

const NEVER_CACHE_PREFIXES = [
  "/api/",
  "/admin",
  "/member",
  "/profile",
  "/chapter",
  "/community",
  "/events",
  "/notifications",
  "/payments",
  "/certificates",
  "/verify",
  "/login",
  "/activate",
  "/forgot-password",
  "/reset-password",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (NEVER_CACHE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  const isShellAsset = SHELL_ASSETS.includes(url.pathname);
  if (!isShellAsset) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
  );
});
