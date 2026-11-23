// Servidor estático mínimo para probar Cafetal en local.
// Uso:  node servidor.mjs   →  http://localhost:5180   (otro puerto: node servidor.mjs 8080)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(fileURLToPath(new URL("./app/", import.meta.url)));
const PUERTO = Number(process.argv[2] || process.env.PORT || 5180);

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".wasm": "application/wasm",
  ".map": "application/json",
};

createServer(async (req, res) => {
  try {
    const ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let archivo = resolve(join(RAIZ, normalize(ruta)));
    if (!archivo.startsWith(RAIZ)) {
      res.writeHead(403).end("Prohibido");
      return;
    }
    if ((await stat(archivo)).isDirectory()) archivo = join(archivo, "index.html");
    const datos = await readFile(archivo);
    res.writeHead(200, {
      "Content-Type": TIPOS[extname(archivo)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(datos);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("No encontrado");
  }
}).listen(PUERTO, () => {
  console.log(`Cafetal en http://localhost:${PUERTO}`);
});
