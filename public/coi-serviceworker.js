/* coi-serviceworker v0.1.7 - https://github.com/gzuidhof/coi-serviceworker */
/* Injects Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers
   so SharedArrayBuffer is available on static hosts like GitHub Pages.        */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
    e.waitUntil(self.clients.claim())
);

async function handleFetch(request) {
    // Pass-through for non-GET or chrome-extension requests
    if (
        request.cache === "only-if-cached" &&
        request.mode !== "same-origin"
    ) {
        return fetch(request);
    }

    let r;
    try {
        r = await fetch(request);
    } catch (e) {
        return fetch(request);
    }

    if (r.status === 0) return r;

    const newHeaders = new Headers(r.headers);
    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
    newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
    newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

    return new Response(r.body, {
        status: r.status,
        statusText: r.statusText,
        headers: newHeaders,
    });
}

self.addEventListener("fetch", (e) => e.respondWith(handleFetch(e.request)));