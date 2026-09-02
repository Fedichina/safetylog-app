/**
 * SERVICE WORKER
 * ------------------------------------------------------------
 * WHAT THIS DOES:
 * Caches the "app shell" (HTML/CSS/JS files) on the phone the first
 * time someone visits, so the app still opens and is usable without
 * internet afterward. This is what makes "Add to Home Screen" behave
 * like a real installed app instead of just a bookmark.
 *
 * WHAT THIS DOES NOT DO:
 * It does NOT cache your Firestore data or uploaded files — that
 * offline behavior is handled separately by Firestore's own offline
 * persistence (see firebase-config.js). This service worker only
 * caches the static files needed to draw the screen.
 *
 * IMPORTANT — BUMP THE CACHE VERSION WHEN YOU CHANGE FILES:
 * Browsers aggressively cache service workers. If you edit any file
 * listed in APP_SHELL_FILES (or add new pages), increment CACHE_NAME
 * below (e.g. "safetylog-v1" -> "safetylog-v2") or your changes may not
 * show up for users who already installed the app.
 * ------------------------------------------------------------
 */

const CACHE_NAME = "safetylog-v1";

const APP_SHELL_FILES = [
  "/index.html",
  "/manifest.json",
  "/css/style.css",
  "/css/documents.css",
  "/js/firebase-config.js",
  "/js/shared/utils.js",
  "/js/shared/staff-list.js",
  "/js/modules/documents.js",
  "/pages/documents.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept Firebase/Firestore/Storage or Google API calls —
  // let those go straight to the network so Firebase's own SDKs can
  // manage caching, auth, and offline queuing correctly. Intercepting
  // these here would conflict with Firestore's offline persistence.
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebasestorage.googleapis.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com")
  ) {
    return;
  }

  // Cache-first for our own app shell files: fast loads, works offline.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          // If both cache and network fail (e.g. offline + not cached yet),
          // fall back to the home page shell where possible.
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        })
      );
    })
  );
});
