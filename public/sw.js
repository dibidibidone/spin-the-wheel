// Minimal service worker — its ONLY job is to make the page installable as a PWA.
// It deliberately does NOT cache or intercept anything: the `fetch` listener exists
// only to satisfy install-eligibility checks, and by never calling `event.respondWith`
// it lets the browser handle every request normally (no offline behavior by design).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* intentional no-op: do not intercept */ });
