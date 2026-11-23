import { Sheet } from "./sheet.js";
import { Spring, reduceMotion } from "./spring.js";
import { FICHAS, CANTONES, EJEMPLOS, fichaPorId } from "./kb.js";
import * as motor from "./engine.js";
import * as store from "./store.js";
import { SISTEMA_REGISTRO, SISTEMA_EXPLICACION } from "./prompts.js";

const $ = (selector, raiz = document) => raiz.querySelector(selector);
const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];
const esc = (texto) =>
  String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const numero = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });
const fechaCorta = new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "short" });
const fechaLarga = new Intl.DateTimeFormat("es-EC", { dateStyle: "long", timeStyle: "short" });
const plural = new Intl.PluralRules("es");
const cuantos = (n, uno, varios) => `${numero.format(n)} ${plural.select(n) === "one" ? uno : varios}`;
const peso = (mb) => (mb >= 1000 ? `${numero.format(mb / 1024)} GB` : `${Math.round(mb)} MB`);

const SEVERIDAD = { leve: "Leve", moderada: "Moderada", alta: "Alta", no_indicada: "No indicada" };
const nombreProblema = (id) => fichaPorId(id)?.nombre || "Sin diagnóstico";

const prefs = store.leerPrefs();
const estado = {
  fase: "revisando", // revisando | incompatible | sin-modelo | descargando | cargando | listo | error
  eleccion: prefs.modelo || "equilibrado",
  progreso: 0,
  textoProgreso: "",
  error: "",
  ocupado: false,
  actual: null, // análisis en pantalla, todavía sin guardar
  ultima: null, // última medición
};

const hoja = new Sheet($("#hoja"));
const form = $("#form-visita");
const campoNota = $("#nota");
const ayuda = $("#nota-ayuda");
const botonAnalizar = $("#analizar");

// ---------- Aviso breve ----------
let relojToast = 0;
function avisar(texto) {
  const toast = $("#toast");
  toast.textContent = texto;
  toast.classList.add("visible");
  clearTimeout(relojToast);
  relojToast = setTimeout(() => toast.classList.remove("visible"), 2600);
}

// ---------- Pestañas con indicador a resorte ----------
const tabs = $$(".tab");
const indicador = $(".tabs-indicador");
const resorteTab = new Spring({
  precision: 0.2,
  onUpdate: (x) => (indicador.style.transform = `translate3d(${x}px, 0, 0)`),
});

function irA(nombre, { animar = true } = {}) {
  const indice = tabs.findIndex((t) => t.dataset.ir === nombre);
  if (indice < 0) return;
  tabs.forEach((t, i) => (i === indice ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current")));
  $$(".view").forEach((v) => (v.hidden = v.id !== `v-${nombre}`));
  const x = indice * indicador.offsetWidth;
  if (animar && !reduceMotion()) resorteTab.to(x, { damping: 1, response: 0.34 });
  else resorteTab.set(x);
  if (nombre === "historial") pintarHistorial();
  window.scrollTo({ top: 0 });
}

tabs.forEach((t) => t.addEventListener("click", () => irA(t.dataset.ir)));
addEventListener("resize", () => {
  const indice = tabs.findIndex((t) => t.hasAttribute("aria-current"));
  resorteTab.set(indice * indicador.offsetWidth);
});

// ---------- Estado del modelo ----------
const TEXTO_ESTADO = {
  revisando: "Revisando el equipo",
  incompatible: "Equipo no compatible",
  "sin-modelo": "Modelo sin descargar",
  descargando: "Descargando modelo",
  cargando: "Cargando modelo",
  listo: "Modelo listo en el equipo",
  error: "Hubo un problema",
};

function pintarEstado() {
  const boton = $("#estado");
  boton.dataset.fase = estado.fase;
  $("#estado-texto").textContent = TEXTO_ESTADO[estado.fase];
  botonAnalizar.disabled = estado.fase !== "listo" || estado.ocupado;
  botonAnalizar.textContent = estado.ocupado ? "Analizando…" : "Analizar en este equipo";
  pintarPreparar();
}

function pintarPreparar() {
  const caja = $("#preparar");
  const modelo = motor.modeloPorClave(estado.eleccion);

  if (estado.fase === "listo" || estado.fase === "revisando") {
    caja.innerHTML = "";
    return;
  }

  if (estado.fase === "incompatible") {
    caja.innerHTML = `
      <div class="tarjeta aparece">
        <h2>Este navegador no puede correr el modelo</h2>
        <p>${esc(estado.error)} El modelo necesita WebGPU para usar el procesador gráfico del equipo.</p>
        <p class="nota-pie">Abra esta página en Chrome o Edge actualizados. La guía y el historial sí funcionan aquí.</p>
      </div>`;
    return;
  }

  if (estado.fase === "error") {
    caja.innerHTML = `
      <div class="tarjeta aparece">
        <h2>No se pudo preparar el modelo</h2>
        <p>${esc(estado.error)}</p>
        <div class="acciones"><button class="btn suave" type="button" data-accion="descargar">Intentar de nuevo</button></div>
      </div>`;
    return;
  }

  if (estado.fase === "descargando" || estado.fase === "cargando") {
    const titulo = estado.fase === "descargando" ? "Descargando el modelo" : "Cargando el modelo desde este equipo";
    const detalle =
      estado.fase === "descargando"
        ? `${modelo.modelo} · ${peso(modelo.descargaMB)}. Solo se descarga una vez.`
        : `${modelo.modelo}. Ya está guardado, no se usa internet.`;
    // Se actualiza la barra sin volver a dibujar la tarjeta para no cortar la transición.
    if (!$(".progreso-barra", caja) || caja.dataset.fase !== estado.fase) {
      caja.dataset.fase = estado.fase;
      caja.innerHTML = `
        <div class="tarjeta aparece">
          <h2>${titulo}</h2>
          <p>${esc(detalle)}</p>
          <div class="progreso" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div class="progreso-barra"></div></div>
          <div class="progreso-texto"><span id="progreso-etapa"></span><span id="progreso-pct"></span></div>
        </div>`;
    }
    const pct = Math.round(estado.progreso * 100);
    $(".progreso-barra", caja).style.transform = `scaleX(${estado.progreso})`;
    $(".progreso", caja).setAttribute("aria-valuenow", String(pct));
    $("#progreso-pct").textContent = `${pct} %`;
    $("#progreso-etapa").textContent =
      estado.textoProgreso === "calentando"
        ? "Calentando el modelo"
        : estado.fase === "descargando"
          ? "Guardando en el equipo"
          : "Preparando la tarjeta gráfica";
    return;
  }

  // sin-modelo
  caja.dataset.fase = "sin-modelo";
  caja.innerHTML = `
    <div class="tarjeta aparece">
      <h2>Prepare el equipo antes de salir al campo</h2>
      <p>El modelo se descarga una sola vez con internet. Después todo funciona sin señal.</p>
      <div class="opciones" role="radiogroup" aria-label="Tamaño del modelo">
        ${motor.MODELOS.map(
          (m) => `
          <label class="opcion">
            <input type="radio" name="modelo" value="${m.clave}" ${m.clave === estado.eleccion ? "checked" : ""}>
            <span class="opcion-nombre">${m.nombre} · ${m.modelo}</span>
            <span class="opcion-detalle">${m.paraQuien}</span>
            <span class="opcion-peso">${peso(m.descargaMB)}</span>
          </label>`,
        ).join("")}
      </div>
      <button class="btn primario" type="button" data-accion="descargar">Descargar modelo · ${peso(modelo.descargaMB)}</button>
    </div>`;
}

$("#preparar").addEventListener("change", (e) => {
  if (e.target.name !== "modelo") return;
  estado.eleccion = e.target.value;
  store.guardarPrefs({ modelo: estado.eleccion });
  const modelo = motor.modeloPorClave(estado.eleccion);
  $('[data-accion="descargar"]', $("#preparar")).textContent = `Descargar modelo · ${peso(modelo.descargaMB)}`;
});

$("#preparar").addEventListener("click", (e) => {
  if (e.target.closest('[data-accion="descargar"]')) prepararModelo({ descargado: false });
});

async function prepararModelo({ descargado }) {
  const modelo = motor.modeloPorClave(estado.eleccion);
  estado.fase = descargado ? "cargando" : "descargando";
  estado.progreso = 0;
  pintarEstado();
  try {
    await motor.cargar(modelo, ({ progreso, texto }) => {
      estado.progreso = Math.max(estado.progreso, progreso || 0);
      estado.textoProgreso = texto || "";
      pintarPreparar();
    });
    estado.fase = "listo";
    pintarEstado();
    avisar(descargado ? "Modelo cargado desde este equipo" : "Listo. Ya puede trabajar sin internet");
  } catch (error) {
    estado.fase = "error";
    estado.error = error?.message || String(error);
    pintarEstado();
  }
}

// ---------- Formulario ----------
$("#canton").innerHTML =
  `<option value="">Sin indicar</option>` + CANTONES.map((c) => `<option>${esc(c)}</option>`).join("");

$("#chips").innerHTML = EJEMPLOS.map((e, i) => `<button class="chip" type="button" data-ejemplo="${i}">${esc(e.titulo)}</button>`).join("");

$("#chips").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-ejemplo]");
  if (!chip) return;
  const ejemplo = EJEMPLOS[Number(chip.dataset.ejemplo)];
  campoNota.value = ejemplo.nota;
  form.productor.value = ejemplo.productor || "";
  form.canton.value = ejemplo.canton || "";
  ayuda.textContent = "";
  campoNota.focus({ preventScroll: true });
});

campoNota.addEventListener("input", () => (ayuda.textContent = ""));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (estado.ocupado || estado.fase !== "listo") return;
  const nota = campoNota.value.trim();
  if (nota.split(/\s+/).length < 5) {
    ayuda.textContent = "Escriba al menos una frase con lo que observó en el cafetal.";
    campoNota.focus();
    return;
  }
  await analizarNota(nota);
});

// ---------- Análisis ----------
const PASOS = [
  { id: "fichas", titulo: "Buscar fichas en la guía local" },
  { id: "registro", titulo: "Leer la nota y llenar el registro" },
  { id: "explicacion", titulo: "Redactar la explicación para el productor" },
];

function pintarPasos(activo, detalles = {}) {
  const orden = PASOS.map((p) => p.id);
  const iActivo = orden.indexOf(activo);
  $("#resultado").innerHTML = `
    <div class="tarjeta" id="tarjeta-pasos">
      <div class="pasos">
        ${PASOS.map((p, i) => {
          const est = i < iActivo ? "hecho" : i === iActivo ? "activo" : "pendiente";
          return `<div class="paso" data-estado="${est}">
            <span class="paso-marca" aria-hidden="true"></span>
            <span>${p.titulo}${detalles[p.id] ? `<span class="paso-detalle">${esc(detalles[p.id])}</span>` : ""}</span>
          </div>`;
        }).join("")}
      </div>
      <div class="acciones"><button class="btn chico" type="button" data-accion="detener">Detener</button></div>
    </div>`;
}

async function analizarNota(nota) {
  estado.ocupado = true;
  estado.actual = null;
  pintarEstado();
  const detalles = {};
  pintarPasos("fichas", detalles);
  $("#resultado").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });

  try {
    const salida = await motor.analizar(nota, {
      alPaso: (paso, datos) => {
        if (paso === "fichas") {
          detalles.fichas = datos.candidatas.map((f) => f.nombre).join(" · ");
          pintarPasos("registro", detalles);
        }
        if (paso === "recarga") {
          detalles.registro = "La tarjeta gráfica se reinició. Recargando el modelo…";
          pintarPasos("registro", detalles);
        }
        if (paso === "registro") {
          const r = datos.registro;
          estado.actual = nuevaVisita(nota, r);
          if (fichaPorId(r.problema)) pintarResultado({ escribiendo: true });
        }
      },
      alExplicar: (texto) => {
        const p = $("#explicacion");
        if (p) p.textContent = texto;
      },
    });
    estado.ultima = salida.medicion;
    estado.actual = { ...nuevaVisita(nota, salida.registro), explicacion: salida.explicacion, medicion: salida.medicion };
    pintarResultado({ escribiendo: false });
  } catch (error) {
    if (error?.codigo === "gpu") estado.fase = "sin-modelo";
    $("#resultado").innerHTML = `
      <div class="tarjeta aparece">
        <h2>No se completó el análisis</h2>
        <p>${esc(error?.message || error)}</p>
        <p class="nota-pie">La nota sigue en el formulario. Puede intentarlo otra vez.</p>
      </div>`;
  } finally {
    estado.ocupado = false;
    pintarEstado();
  }
}

function nuevaVisita(nota, registro) {
  return {
    id: crypto.randomUUID(),
    fecha: new Date().toISOString(),
    productor: form.productor.value.trim(),
    canton: form.canton.value,
    nota,
    ...registro,
    problemaModelo: registro.problema,
    corregido: false,
    explicacion: "",
    guardada: false,
  };
}

function htmlDatos(v) {
  const dato = (nombre, valor) =>
    `<div><dt>${nombre}</dt><dd class="${valor ? "" : "vacio"}">${valor ? esc(valor) : "No consta"}</dd></div>`;
  return `<dl class="datos">
    ${dato("Severidad descrita", v.severidad && v.severidad !== "no_indicada" ? SEVERIDAD[v.severidad] : "")}
    ${dato("Parte afectada", v.parte ? v.parte[0].toUpperCase() + v.parte.slice(1).replace("raices", "raíces") : "")}
    ${dato("Afectado", v.porcentaje != null ? `${numero.format(v.porcentaje)} %` : "")}
    ${dato("Lote", v.lote)}
    ${dato("Variedad", v.variedad)}
    ${dato("Altitud", v.altitud != null ? `${numero.format(v.altitud)} m` : "")}
  </dl>`;
}

function htmlFicha(ficha) {
  return `
    <div class="bloque">
      <h3>Qué hacer</h3>
      <ol class="pasos-manejo">${ficha.manejo.map((m) => `<li><span>${esc(m)}</span></li>`).join("")}</ol>
      <p class="origen">Texto de la ficha técnica, no generado por IA. Fuente: ${ficha.fuentes
        .map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.corto)}</a>`)
        .join(" · ")}</p>
    </div>
    <div class="bloque">
      <h3>Confirme en campo</h3>
      <ul class="lista">${ficha.confirmar.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
    </div>`;
}

function htmlMedicion(m) {
  if (!m) return "";
  return `<div class="medicion">
    <span>${esc(m.modelo)}</span>
    <span>${numero.format(m.segundos)} s</span>
    ${m.tokensPorSegundo ? `<span>${numero.format(m.tokensPorSegundo)} tokens/s</span>` : ""}
    <span class="${m.solicitudesRed === 0 ? "ok" : ""}">${cuantos(m.solicitudesRed, "solicitud", "solicitudes")} de red</span>
    <span>${m.enLinea ? "Con conexión, sin usarla" : "Sin conexión"}</span>
  </div>`;
}

function pintarResultado({ escribiendo }) {
  const v = estado.actual;
  const ficha = fichaPorId(v.problema);
  const caja = $("#resultado");

  if (!ficha) {
    caja.innerHTML = `
      <article class="tarjeta aparece">
        <p class="sobretitulo">Resultado</p>
        <h2>La nota no alcanza para un diagnóstico</h2>
        <p>Los síntomas no coinciden con ninguna ficha de la guía local, o la nota no describe síntomas. El modelo prefiere no adivinar.</p>
        <div class="bloque">${htmlDatos(v)}</div>
        <div class="aviso neutro">Puede guardar la visita como pendiente y revisarla con el técnico de la asociación.</div>
        ${htmlMedicion(v.medicion)}
        <div class="acciones">
          <button class="btn primario" type="button" data-accion="guardar">Guardar como pendiente</button>
          <button class="btn" type="button" data-accion="corregir">Elegir ficha</button>
        </div>
      </article>`;
    return;
  }

  const confianza = v.corregido ? "" : `<span class="pildora ${v.confianza}">Confianza ${v.confianza}</span>`;
  caja.innerHTML = `
    <article class="tarjeta ${escribiendo ? "aparece" : ""}">
      <div class="resultado-cabecera">
        <p class="sobretitulo">${v.corregido ? "Diagnóstico corregido por el técnico" : "Problema probable"}</p>
        ${confianza}
        <h2>${esc(ficha.nombre)}</h2>
        <p class="cientifico"><em>${esc(ficha.cientifico)}</em> · ${esc(ficha.tipo)}</p>
      </div>
      ${v.avisos?.map((a) => `<div class="aviso">${esc(a)}</div>`).join("") || ""}
      ${
        v.evidencias?.length
          ? `<div class="bloque"><h3>Lo que dice la nota</h3>
             <ul class="citas">${v.evidencias.map((c) => `<li>«${esc(c)}»</li>`).join("")}</ul></div>`
          : ""
      }
      <div class="bloque">${htmlDatos(v)}</div>
      ${
        v.corregido
          ? ""
          : `<div class="bloque"><h3>Explicación para el productor</h3>
             <p class="explicacion ${escribiendo ? "escribiendo" : ""}" id="explicacion">${esc(v.explicacion)}</p></div>`
      }
      ${htmlFicha(ficha)}
      <div class="aviso neutro">Sugerencia de un modelo local. La decisión sobre el cultivo la toma el técnico con el productor.</div>
      ${htmlMedicion(v.medicion)}
      <div class="acciones">
        <button class="btn primario" type="button" data-accion="guardar" ${escribiendo || v.guardada ? "disabled" : ""}>${v.guardada ? "Visita guardada" : "Guardar visita"}</button>
        <button class="btn" type="button" data-accion="corregir" ${escribiendo ? "disabled" : ""}>Corregir</button>
      </div>
    </article>`;
}

$("#resultado").addEventListener("click", (e) => {
  const accion = e.target.closest("[data-accion]")?.dataset.accion;
  if (accion === "detener") motor.detener();
  if (accion === "guardar") guardarActual();
  if (accion === "corregir") abrirCorreccion(e.target);
});

function guardarActual() {
  const v = estado.actual;
  if (!v || v.guardada) return;
  const { guardada, ...registro } = v;
  if (!store.guardarVisita(registro)) {
    avisar("No hay espacio para guardar en este equipo");
    return;
  }
  v.guardada = true;
  navigator.vibrate?.(12);
  pintarResultado({ escribiendo: false });
  avisar("Visita guardada en este equipo");
}

function abrirCorreccion(origen) {
  const v = estado.actual;
  hoja.open({
    title: "Corregir diagnóstico",
    trigger: origen,
    html: `
      <p class="nota-pie" style="margin:0 0 12px">Su corrección queda registrada junto a lo que propuso el modelo. Así se sabe dónde se equivoca.</p>
      <div class="lista-filas" style="box-shadow:none;background:var(--fill)">
        ${[...FICHAS, { id: "no_determinado", nombre: "Sin diagnóstico", cientifico: "Pendiente de revisar" }]
          .map(
            (f) => `<button class="fila" type="button" data-corregir="${f.id}">
              <span class="fila-titulo">${esc(f.nombre)}</span>
              <span class="fila-sub"><em>${esc(f.cientifico)}</em></span>
              <span class="fila-lado">${f.id === v.problema ? "Actual" : ""}</span>
            </button>`,
          )
          .join("")}
      </div>`,
  });
}

$("#hoja").addEventListener("click", (e) => {
  const corregir = e.target.closest("[data-corregir]");
  if (corregir && estado.actual) {
    const id = corregir.dataset.corregir;
    estado.actual.corregido = id !== estado.actual.problemaModelo;
    estado.actual.problema = id;
    estado.actual.avisos = [];
    if (estado.actual.guardada) store.actualizarVisita(estado.actual.id, { problema: id, corregido: estado.actual.corregido });
    hoja.close();
    pintarResultado({ escribiendo: false });
    avisar("Diagnóstico actualizado");
  }
  const borrar = e.target.closest("[data-borrar]");
  if (borrar) {
    if (borrar.dataset.confirmado) {
      store.borrarVisita(borrar.dataset.borrar);
      hoja.close();
      pintarHistorial();
      avisar("Visita eliminada");
    } else {
      borrar.dataset.confirmado = "1";
      borrar.textContent = "Tocar otra vez para eliminar";
    }
  }
  const accion = e.target.closest("[data-accion]")?.dataset.accion;
  if (accion === "borrar-modelo") borrarModelo(e.target.closest("[data-accion]"));
});

// ---------- Historial ----------
const flecha = `<svg viewBox="0 0 8 14" aria-hidden="true"><path d="M1 1l6 6-6 6"/></svg>`;

function pintarHistorial() {
  const visitas = store.leerVisitas();
  const caja = $("#historial");
  if (!visitas.length) {
    caja.innerHTML = `<div class="tarjeta vacio-estado"><strong>Aún no hay visitas</strong>Analice una nota y guárdela. Aparecerá aquí aunque no tenga internet.</div>`;
    return;
  }
  const focos = store.detectarFocos(visitas);
  caja.innerHTML = `
    ${focos
      .map(
        (f) => `<div class="foco"><b>${f.n}</b><span>reportes de ${esc(nombreProblema(f.problema).toLowerCase())} en ${esc(f.canton)} en los últimos ${f.dias} días</span></div>`,
      )
      .join("")}
    <div class="barra-acciones">
      <span>${cuantos(visitas.length, "visita", "visitas")}</span>
      <button class="btn chico suave" type="button" data-accion="exportar">Exportar para sincronizar</button>
    </div>
    <div class="lista-filas">
      ${visitas
        .map(
          (v) => `<button class="fila" type="button" data-visita="${v.id}">
            <span class="fila-titulo">${esc(nombreProblema(v.problema))}</span>
            <span class="fila-sub">${esc([v.productor, v.canton].filter(Boolean).join(" · ") || "Sin datos del productor")}</span>
            <span class="fila-lado">${fechaCorta.format(new Date(v.fecha))}${flecha}</span>
          </button>`,
        )
        .join("")}
    </div>`;
}

$("#historial").addEventListener("click", (e) => {
  if (e.target.closest('[data-accion="exportar"]')) return exportar();
  const fila = e.target.closest("[data-visita]");
  if (!fila) return;
  const v = store.leerVisitas().find((x) => x.id === fila.dataset.visita);
  if (!v) return;
  const ficha = fichaPorId(v.problema);
  hoja.open({
    title: nombreProblema(v.problema),
    trigger: fila,
    html: `
      <div class="bloque">
        <p class="sobretitulo">${esc(fechaLarga.format(new Date(v.fecha)))}</p>
        <p style="margin-top:4px">${esc([v.productor, v.canton].filter(Boolean).join(" · ") || "Sin datos del productor")}</p>
        ${v.corregido ? `<div class="aviso neutro">Corregido por el técnico. El modelo había propuesto: ${esc(nombreProblema(v.problemaModelo))}.</div>` : ""}
      </div>
      <div class="bloque"><h3>Nota original</h3><p class="nota-original">${esc(v.nota)}</p></div>
      <div class="bloque">${htmlDatos(v)}</div>
      ${v.explicacion && !v.corregido ? `<div class="bloque"><h3>Explicación para el productor</h3><p>${esc(v.explicacion)}</p></div>` : ""}
      ${ficha ? htmlFicha(ficha) : ""}
      ${htmlMedicion(v.medicion)}
      <div class="acciones"><button class="btn peligro" type="button" data-borrar="${v.id}">Eliminar visita</button></div>`,
  });
});

function exportar() {
  const visitas = store.leerVisitas();
  const archivo = new Blob([JSON.stringify({ exportado: new Date().toISOString(), visitas }, null, 2)], {
    type: "application/json",
  });
  const enlace = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(archivo),
    download: `cafetal-visitas-${new Date().toISOString().slice(0, 10)}.json`,
  });
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
  avisar(`${cuantos(visitas.length, "visita exportada", "visitas exportadas")}`);
}

// ---------- Guía ----------
function pintarGuia() {
  $("#guia").innerHTML = `
    <div class="lista-filas">
      ${FICHAS.map(
        (f) => `<button class="fila" type="button" data-ficha="${f.id}">
          <span class="fila-titulo">${esc(f.nombre)}</span>
          <span class="fila-sub"><em>${esc(f.cientifico)}</em> · ${esc(f.tipo)}</span>
          <span class="fila-lado">${flecha}</span>
        </button>`,
      ).join("")}
    </div>
    <p class="nota-pie" style="margin:0 4px">Fichas resumidas para la prueba de concepto a partir de manuales técnicos públicos. Cada una enlaza su fuente.</p>`;
}

$("#guia").addEventListener("click", (e) => {
  const fila = e.target.closest("[data-ficha]");
  if (!fila) return;
  const f = fichaPorId(fila.dataset.ficha);
  hoja.open({
    title: f.nombre,
    trigger: fila,
    html: `
      <div class="bloque"><p class="cientifico"><em>${esc(f.cientifico)}</em> · ${esc(f.tipo)}</p></div>
      <div class="bloque"><h3>Cómo se reconoce</h3><ul class="lista">${f.sintomas.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
      <div class="bloque"><h3>Cuándo aparece</h3><ul class="lista">${f.condiciones.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
      ${htmlFicha(f)}
      <div class="bloque"><h3>Fuentes</h3><ul class="lista">${f.fuentes
        .map((x) => `<li>${esc(x.referencia)} <a class="enlace" href="${esc(x.url)}" target="_blank" rel="noopener">Abrir</a></li>`)
        .join("")}</ul></div>`,
  });
});

// ---------- Cómo funciona ----------
$("#estado").addEventListener("click", async (e) => {
  const boton = e.currentTarget;
  const cargado = motor.modeloCargado();
  const modelo = motor.modeloPorClave(estado.eleccion);
  let enDisco = "";
  try {
    const { usage } = await navigator.storage.estimate();
    if (usage) enDisco = peso(usage / 1048576);
  } catch {
    /* dato opcional */
  }
  const m = estado.ultima;
  const fila = (nombre, valor) => `<div><dt>${nombre}</dt><dd>${esc(valor)}</dd></div>`;
  hoja.open({
    title: "Cómo funciona",
    trigger: boton,
    html: `
      <p style="color:var(--text-2);margin-bottom:8px">Un modelo de lenguaje pequeño corre dentro de este navegador, sobre la tarjeta gráfica del equipo. La nota nunca viaja a un servidor.</p>
      <dl class="tabla">
        ${fila("Modelo", cargado ? `${cargado.modelo.modelo}` : `${modelo.modelo} (sin cargar)`)}
        ${cargado ? fila("Identificador", cargado.id) : ""}
        ${cargado?.gpu ? fila("Procesador gráfico", cargado.gpu) : ""}
        ${enDisco ? fila("Guardado en este equipo", enDisco) : ""}
        ${fila("Conexión ahora", navigator.onLine ? "Hay internet, pero no se usa" : "Sin internet")}
        ${m ? fila("Último análisis", `${numero.format(m.segundos)} s`) : ""}
        ${m?.tokensPorSegundo ? fila("Velocidad", `${numero.format(m.tokensPorSegundo)} tokens/s`) : ""}
        ${m ? fila("Solicitudes de red en el análisis", String(m.solicitudesRed)) : ""}
      </dl>
      <div class="bloque">
        <h3>Qué hace con cada nota</h3>
        <ol class="pasos-manejo">
          <li><span>Busca en la guía local las fichas que más se parecen a la nota. Esto no usa IA.</span></li>
          <li><span>El modelo lee la nota y llena un registro con formato obligado. Tiene que citar frases de la nota.</span></li>
          <li><span>La app descarta cualquier dato que no esté escrito en la nota.</span></li>
          <li><span>El modelo redacta una explicación breve usando solo la ficha elegida. Las recomendaciones se copian de la ficha.</span></li>
        </ol>
      </div>
      <div class="bloque">
        <h3>Instrucciones que recibe el modelo</h3>
        <details class="instrucciones"><summary>Para llenar el registro</summary><pre>${esc(SISTEMA_REGISTRO)}</pre></details>
        <details class="instrucciones"><summary>Para explicar al productor</summary><pre>${esc(SISTEMA_EXPLICACION)}</pre></details>
      </div>
      ${
        estado.fase === "listo"
          ? `<div class="acciones"><button class="btn peligro" type="button" data-accion="borrar-modelo">Borrar el modelo de este equipo</button></div>`
          : ""
      }`,
  });
});

async function borrarModelo(boton) {
  if (!boton.dataset.confirmado) {
    boton.dataset.confirmado = "1";
    boton.textContent = "Tocar otra vez para borrar";
    return;
  }
  boton.disabled = true;
  await motor.borrar(motor.modeloPorClave(estado.eleccion));
  hoja.close();
  estado.fase = "sin-modelo";
  estado.ultima = null;
  pintarEstado();
  avisar("Modelo borrado. Las visitas se conservan");
}

addEventListener("online", () => avisar("Volvió la conexión. Cafetal no la necesita"));
addEventListener("offline", () => avisar("Sin conexión. Cafetal sigue funcionando"));

// ---------- Arranque ----------
async function iniciar() {
  pintarGuia();
  irA("visita", { animar: false });
  pintarEstado();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});

  const equipo = await motor.revisarDispositivo();
  if (!equipo.compatible) {
    estado.fase = "incompatible";
    estado.error = equipo.motivo;
    pintarEstado();
    return;
  }
  const modelo = motor.modeloPorClave(estado.eleccion);
  if (await motor.enCache(modelo)) {
    await prepararModelo({ descargado: true });
  } else {
    estado.fase = "sin-modelo";
    pintarEstado();
  }
}

iniciar();
