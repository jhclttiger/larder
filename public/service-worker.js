/* Larder — minimal offline app-shell caching.
   Caches the static shell (HTML/JS/manifest/icons) so the app still opens
   on a spotty kitchen wifi connection. API calls (/api/*) are NEVER cached
   here — those always go straight to the network so everyone sees live,
   current data. Static files use "stale-while-revalidate": show the cached
   copy instantly, then quietly fetch a fresh one in the background for next
   time. */
var CACHE_NAME = "larder-shell-v1";
var SHELL_FILES = ["/", "/app.js", "/manifest.json"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(SHELL_FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.pathname.indexOf("/api/") === 0) return; // always live for data

  event.respondWith(
    caches.match(req).then(function (cached) {
      var fresh = fetch(req).then(function (resp) {
        if (resp && resp.status === 200) {
          var copy = resp.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return resp;
      }).catch(function () { return cached; });
      return cached || fresh;
    })
  );
});
