// Motor local: descarga el modelo una vez, lo carga en la GPU del equipo y analiza notas sin red.
import * as webllm from "../vendor/web-llm/index.js";
import { FICHAS, buscarFichas, fichaPorId, puntuarFichas } from "./kb.js";
import { mensajesRegistro, mensajesExplicacion, esquemaRegistro, sinRazonamiento } from "./prompts.js";

export const MODELOS = [
  {
    clave: "ligero",
    nombre: "Ligero",
    modelo: "Qwen 3.5 · 0.8B",
    paraQuien: "Teléfonos y equipos modestos",
    f16: "Qwen3.5-0.8B-q4f16_1-MLC",
    f32: "Qwen3.5-0.8B-q4f32_1-MLC",
    descargaMB: 426,
  },
  {
    clave: "equilibrado",
    nombre: "Equilibrado",
    modelo: "Qwen 3.5 · 2B",
    paraQuien: "Recomendado para laptop o tableta",
    f16: "Qwen3.5-2B-q4f16_1-MLC",
    f32: "Qwen3.5-2B-q4f32_1-MLC",
    descargaMB: 1032,
  },
  {
    clave: "preciso",
    nombre: "Preciso",
    modelo: "Llama 3.2 · 3B",
    paraQuien: "Equipos con tarjeta gráfica dedicada",
    f16: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    f32: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
    descargaMB: 1733,
  },
];

export const modeloPorClave = (clave) => MODELOS.find((m) => m.clave === clave) || MODELOS[1];

// ---- Contador de solicitudes de red (hilo principal + hilo del modelo) ----
export const red = { total: 0, ultimas: [] };
const anotar = (url) => {
  red.total += 1;
  red.ultimas.push(url);
  if (red.ultimas.length > 20) red.ultimas.shift();
};
try {
  new PerformanceObserver((lista) => lista.getEntries().forEach((e) => anotar(e.name))).observe({
    type: "resource",
    buffered: false,
  });
} catch {
  /* navegador sin PerformanceObserver: el contador queda solo con el hilo del modelo */
}
new BroadcastChannel("cafetal-red").onmessage = (e) => anotar(e.data.url);

// ---- Dispositivo ----
let dispositivo = null;

export async function revisarDispositivo() {
  if (dispositivo) return dispositivo;
  if (!("gpu" in navigator)) {
    dispositivo = { compatible: false, motivo: "Este navegador no tiene WebGPU." };
    return dispositivo;
  }
  try {
    const adaptador = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adaptador) {
      dispositivo = { compatible: false, motivo: "No se encontró un procesador gráfico disponible." };
      return dispositivo;
    }
    dispositivo = { compatible: true, f16: adaptador.features.has("shader-f16") };
  } catch (error) {
    dispositivo = { compatible: false, motivo: String(error?.message || error) };
  }
  return dispositivo;
}

export const idDe = (modelo) => (dispositivo?.f16 === false ? modelo.f32 : modelo.f16);

export async function enCache(modelo) {
  try {
    return await webllm.hasModelInCache(idDe(modelo));
  } catch {
    return false;
  }
}

// ---- Carga ----
let motor = null;
let hilo = null;
let cargado = null;

export const modeloCargado = () => cargado;

function liberar() {
  hilo?.terminate();
  hilo = null;
  motor = null;
  cargado = null;
}

// Cada modelo se carga en un hilo nuevo: así nunca queda un estado a medias del modelo anterior.
export async function cargar(modelo, alAvanzar) {
  const id = idDe(modelo);
  if (cargado?.id === id && motor) return cargado;
  liberar();
  try {
    hilo = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    motor = await webllm.CreateWebWorkerMLCEngine(
      hilo,
      id,
      {
        initProgressCallback: (r) => alAvanzar?.({ progreso: r.progress, texto: r.text }),
        logLevel: "WARN",
      },
      // Las notas son cortas: con la mitad del contexto por defecto alcanza y se ocupa menos memoria gráfica.
      { context_window_size: 2048 },
    );
    // Primera inferencia de calentamiento: compila los programas de la GPU ahora y no en el primer análisis.
    alAvanzar?.({ progreso: 1, texto: "calentando" });
    await motor.chat.completions.create({ messages: [{ role: "user", content: "Hola" }], max_tokens: 1 });
    await motor.resetChat();
  } catch (error) {
    liberar();
    throw error;
  }
  let gpu = "";
  try {
    gpu = await motor.getGPUVendor();
  } catch {
    /* dato opcional */
  }
  cargado = { id, modelo, gpu };
  // Pide al navegador que no borre el modelo si falta espacio.
  navigator.storage?.persist?.().catch(() => {});
  return cargado;
}

export async function borrar(modelo) {
  const id = idDe(modelo);
  if (cargado?.id === id) {
    try {
      await motor?.unload();
    } catch {
      /* el hilo se termina igual */
    }
    liberar();
  }
  await webllm.deleteModelAllInfoInCache(id);
}

export function detener() {
  motor?.interruptGenerate();
}

// ---- Análisis ----
const plano = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Nada de lo que el modelo "extrae" se acepta si no está escrito en la nota.
export function validarRegistro(crudo, nota, candidatas) {
  const notaPlana = plano(nota);
  const numeros = (nota.match(/\d+(?:[.,\s]\d{3})*(?:[.,]\d+)?/g) || []).map((n) => n.replace(/[.,\s]/g, ""));
  const estaEnNota = (valor) => valor != null && plano(valor).length > 1 && notaPlana.includes(plano(valor));
  const numeroEnNota = (valor) => valor != null && numeros.includes(String(Math.round(valor)));
  const avisos = [];

  const evidencias = (crudo.citas_de_la_nota || []).map((c) => c.trim().replace(/[.,;:]+$/, "")).filter(estaEnNota);
  let problema = candidatas.some((f) => f.id === crudo.problema) ? crudo.problema : "no_determinado";
  let confianza = crudo.confianza;

  if (problema !== "no_determinado" && evidencias.length === 0) {
    confianza = "baja";
    avisos.push("El modelo no pudo citar frases de la nota que respalden el diagnóstico.");
  }

  let porcentaje = crudo.porcentaje_afectado;
  if (!(porcentaje >= 0 && porcentaje <= 100) || !numeroEnNota(porcentaje)) porcentaje = null;

  return {
    problema,
    confianza: problema === "no_determinado" ? null : confianza,
    severidad: problema === "no_determinado" ? "no_indicada" : crudo.severidad,
    evidencias,
    parte: crudo.parte_afectada && crudo.parte_afectada !== "no_indicada" ? crudo.parte_afectada : null,
    porcentaje,
    lote: estaEnNota(crudo.lote) ? crudo.lote : null,
    variedad: estaEnNota(crudo.variedad) ? crudo.variedad : null,
    altitud: numeroEnNota(crudo.altitud_msnm) ? Math.round(crudo.altitud_msnm) : null,
    avisos,
  };
}

export async function generar({ mensajes, esquema, maxTokens, alEscribir }) {
  const peticion = {
    messages: mensajes,
    temperature: esquema ? 0 : 0.3,
    top_p: 0.9,
    max_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  };
  // Solo los modelos con "modo razonamiento" aceptan este ajuste; en los demás rompe la salida con formato.
  if (/qwen3|minicpm5/i.test(cargado.id)) peticion.extra_body = { enable_thinking: false };
  if (esquema) peticion.response_format = { type: "json_object", schema: JSON.stringify(esquema) };
  const flujo = await motor.chat.completions.create(peticion);
  let texto = "";
  let uso = null;
  let fin = null;
  for await (const parte of flujo) {
    const opcion = parte.choices?.[0];
    const trozo = opcion?.delta?.content;
    if (trozo) {
      texto += trozo;
      alEscribir?.(texto);
    }
    if (opcion?.finish_reason) fin = opcion.finish_reason;
    if (parte.usage) uso = parte.usage;
  }
  return { texto, uso, fin };
}

// Si la tarjeta gráfica se queda sin memoria, WebLLM descarga el modelo por su cuenta.
// Se traduce ese fallo a un mensaje claro y se deja la app lista para elegir otro modelo.
const esFalloDeGPU = (error) =>
  /deleted object|already been disposed|device was lost|device is lost|out of memory|aborted\(\)|GrammarMatcherInitError/i.test(
    String(error?.message || error),
  );

// Un solo formato para todas las notas: la librería lo compila una vez y lo reutiliza.
const ESQUEMA = esquemaRegistro(FICHAS.map((f) => f.id));

export async function analizar(nota, opciones = {}) {
  if (!motor || !cargado) throw new Error("El modelo todavía no está cargado.");
  const modelo = cargado.modelo;
  for (let intento = 1; ; intento++) {
    try {
      const salida = await analizarConModelo(nota, opciones);
      salida.medicion.reintentos = intento - 1;
      return salida;
    } catch (error) {
      if (!esFalloDeGPU(error)) throw error;
      liberar();
      if (intento >= 2) {
        const amigable = new Error("La tarjeta gráfica de este equipo no pudo con el modelo. Elija uno más ligero.");
        amigable.codigo = "gpu";
        throw amigable;
      }
      // El modelo sigue guardado en el equipo: se vuelve a cargar en segundos y se repite el análisis una vez.
      opciones.alPaso?.("recarga", {});
      await cargar(modelo);
    }
  }
}

// Segunda opinión sin IA: si las palabras de la nota apuntan con claridad a otra ficha,
// no se oculta el desacuerdo. Se baja la confianza y se avisa para que decida la persona.
function contrastar(registro, nota) {
  if (registro.problema === "no_determinado") return;
  const puntos = puntuarFichas(nota);
  const mejor = puntos[0];
  const elegida = puntos.find((p) => p.ficha.id === registro.problema);
  if (mejor.ficha.id !== registro.problema && mejor.puntos >= 2 && (elegida?.puntos || 0) * 2 <= mejor.puntos) {
    registro.confianza = "baja";
    registro.discrepancia = mejor.ficha.id;
    registro.avisos.push(
      `La búsqueda por palabras apunta a «${mejor.ficha.nombre}» y el modelo eligió «${elegida.ficha.nombre}». Revise antes de guardar.`,
    );
  }
}

async function analizarConModelo(nota, { alPaso, alExplicar } = {}) {
  const redAntes = red.total;
  const inicio = performance.now();

  // 1. Búsqueda local de fichas candidatas (sin IA).
  const candidatas = buscarFichas(nota);
  alPaso?.("fichas", { candidatas });

  // 2. El modelo lee la nota y llena el registro con formato obligado.
  const ids = candidatas.map((f) => f.id);
  const paso2 = await generar({
    mensajes: mensajesRegistro(nota, candidatas),
    esquema: ESQUEMA,
    maxTokens: 320,
  });
  let crudo;
  try {
    const limpio = sinRazonamiento(paso2.texto);
    crudo = JSON.parse(limpio.slice(limpio.indexOf("{"), limpio.lastIndexOf("}") + 1));
  } catch {
    throw new Error("El modelo devolvió un registro incompleto. Intente de nuevo.");
  }
  const registro = validarRegistro(crudo, nota, candidatas);
  contrastar(registro, nota);
  alPaso?.("registro", { registro });

  // 3. Solo si hay diagnóstico: explicación en lenguaje sencillo, atada a la ficha elegida.
  let explicacion = "";
  let paso3 = null;
  const ficha = fichaPorId(registro.problema);
  if (ficha) {
    paso3 = await generar({
      mensajes: mensajesExplicacion(nota, ficha),
      maxTokens: 220,
      alEscribir: (texto) => alExplicar?.(sinRazonamiento(texto)),
    });
    explicacion = sinRazonamiento(paso3.texto);
  }

  const velocidades = [paso2.uso, paso3?.uso].map((u) => u?.extra?.decode_tokens_per_s).filter(Boolean);
  const tokens = [paso2.uso, paso3?.uso].reduce((n, u) => n + (u?.completion_tokens || 0), 0);
  return {
    registro,
    explicacion,
    candidatas: ids,
    crudo,
    medicion: {
      modelo: cargado.modelo.modelo,
      idModelo: cargado.id,
      segundos: (performance.now() - inicio) / 1000,
      tokens,
      tokensPorSegundo: velocidades.length ? velocidades.reduce((a, b) => a + b, 0) / velocidades.length : null,
      solicitudesRed: red.total - redAntes,
      enLinea: navigator.onLine,
    },
  };
}
