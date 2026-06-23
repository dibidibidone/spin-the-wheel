// Minimal service worker — its only job is to make the page installable.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
// A fetch handler must exist for the install criteria; pass through to the network.
self.addEventListener("fetch", () => {});
