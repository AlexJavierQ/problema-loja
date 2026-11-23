// Guarda la aplicación para que abra sin internet.
// (Los archivos del modelo los guarda WebLLM por su cuenta en la caché del navegador.)
const VERSION = "cafetal-v1";
const ARCHIVOS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./js/main.js",
  "./js/engine.js",
  "./js/worker.js",
  "./js/kb.js",
  "./js/prompts.js",
  "./js/sheet.js",
  "./js/spring.js",
  "./js/store.js",
  "./vendor/web-llm/index.js",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c.startsWith("cafetal-") && c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

// Con internet se sirve lo más reciente y se actualiza la copia; sin internet, la copia guardada.
self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  if (peticion.method !== "GET" || new URL(peticion.url).origin !== self.location.origin) return;
  evento.respondWith(
    fetch(peticion)
      .then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(VERSION).then((cache) => cache.put(peticion, copia));
        }
        return respuesta;
      })
      .catch(() => caches.match(peticion, { ignoreSearch: true }).then((r) => r || caches.match("./index.html"))),
  );
});
