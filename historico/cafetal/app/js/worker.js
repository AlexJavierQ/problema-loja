// El modelo vive en este hilo aparte para que la interfaz nunca se trabe.
import { WebWorkerMLCEngineHandler } from "../vendor/web-llm/index.js";

// Contador de red: cada recurso que este hilo pide a internet queda registrado.
// La interfaz lo usa para mostrar cuántas solicitudes hubo durante un análisis.
const canal = new BroadcastChannel("cafetal-red");
let solicitudes = 0;
const avisar = (url) => {
  solicitudes += 1;
  canal.postMessage({ solicitudes, url: String(url).slice(0, 160) });
};

try {
  new PerformanceObserver((lista) => {
    for (const entrada of lista.getEntries()) avisar(entrada.name);
  }).observe({ type: "resource", buffered: true });
} catch {
  const original = self.fetch.bind(self);
  self.fetch = (...args) => {
    avisar(args[0]?.url ?? args[0]);
    return original(...args);
  };
}

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (mensaje) => handler.onmessage(mensaje);
