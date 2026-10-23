// Mode hors ligne léger : au stade, avec un réseau faible, les pages publiques déjà consultées
// restent lisibles. Toujours le réseau d'abord ; la copie gardée ne sert que s'il ne répond pas.
// Les espaces de connexion, les formulaires et les actions ne passent jamais par ici.
const CACHE = "bdc-v1";
const PRIVE = ["/admin", "/espace-club", "/licence", "/api"];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || PRIVE.some((p) => url.pathname.startsWith(p))) return;

  // Fichiers du site (versionnés par Next.js) : la copie gardée suffit.
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(caches.match(req).then((r) => r ?? fetch(req).then((res) => garder(req, res))));
    return;
  }
  // Pages publiques : réseau d'abord, copie gardée en secours.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => garder(req, res))
        .catch(() => caches.match(req).then((r) => r ?? horsLigne())),
    );
  }
});

function garder(req, res) {
  if (res.ok) {
    const copie = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copie));
  }
  return res;
}

function horsLigne() {
  return new Response(
    '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors ligne</title>' +
      '<body style="font-family:sans-serif;padding:32px;text-align:center;background:#f4f5ee;color:#1b231c"><h1>Pas de connexion</h1>' +
      "<p>Cette page n'a pas encore été ouverte sur ce téléphone. Réessayez quand le réseau revient.</p></body></html>",
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
