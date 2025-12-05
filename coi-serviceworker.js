/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
  self.addEventListener("message", (ev) => {
    if (!ev.data) {
        return;
    } else if (ev.data.type === "deregister") {
        self.registration.unregister().then(() => {
            return self.clients.matchAll();
        }).then(clients => {
            clients.forEach(client => client.navigate(client.url));
        });
    } else if (ev.data.type === "coepCredentialless") {
        coepCredentialless = ev.data.value;
    }
  });
  self.addEventListener("fetch", function (event) {
    const r = event.request;
    if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
      return;
    }
    const request = (coepCredentialless && r.mode === "no-cors")
      ? new Request(r, { credentials: "omit" })
      : r;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }
          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
          if (!newHeaders.get("Cross-Origin-Opener-Policy")) newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
    window.sessionStorage.removeItem("coiReloadedBySelf");
    const coepDegrading = (reloadedBySelf == "coep");
    const coepCredentialless = false;
    if (window.self !== window.top) {
      return;
    }
    const reloadedByO = window.sessionStorage.getItem("coiReloadedByO");
    window.sessionStorage.removeItem("coiReloadedByO");
    if ((!window.isSecureContext) || (window.crossOriginIsolated && !coepDegrading)) {
      return;
    }
    if (reloadedByO) {
        return;
    }
    const n = navigator;
    if (n.serviceWorker) {
        n.serviceWorker.register(window.document.currentScript.src).then(
        (registration) => {
            if (!window.crossOriginIsolated && !coepDegrading) {
                if (reloadedBySelf) {
                    console.log("COOP/COEP Service Worker failed to reload the page correctly.");
                } else {
                    window.sessionStorage.setItem("coiReloadedBySelf", "coep");
                    window.location.reload();
                }
            }
        },
        (err) => {
            console.error("COOP/COEP Service Worker failed to register:", err);
        }
        );
    }
  })();
}