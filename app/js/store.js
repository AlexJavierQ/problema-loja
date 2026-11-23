// Las visitas se guardan solo en este dispositivo.
const CLAVE = "cafetal.visitas.v1";
const PREFS = "cafetal.prefs.v1";

export function leerVisitas() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || [];
  } catch {
    return [];
  }
}

function escribir(visitas) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(visitas));
    return true;
  } catch {
    return false;
  }
}

export function guardarVisita(visita) {
  const visitas = leerVisitas();
  visitas.unshift(visita);
  return escribir(visitas);
}

export function actualizarVisita(id, cambios) {
  const visitas = leerVisitas().map((v) => (v.id === id ? { ...v, ...cambios } : v));
  return escribir(visitas);
}

export function borrarVisita(id) {
  return escribir(leerVisitas().filter((v) => v.id !== id));
}

export function leerPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS)) || {};
  } catch {
    return {};
  }
}

export function guardarPrefs(cambios) {
  try {
    localStorage.setItem(PREFS, JSON.stringify({ ...leerPrefs(), ...cambios }));
  } catch {
    /* sin almacenamiento: la app sigue funcionando */
  }
}

// Focos: el mismo problema repetido en un cantón dentro de la ventana de días.
export function detectarFocos(visitas, { dias = 30, minimo = 3 } = {}) {
  const desde = Date.now() - dias * 86400000;
  const grupos = new Map();
  for (const v of visitas) {
    if (!v.canton || v.problema === "no_determinado" || new Date(v.fecha).getTime() < desde) continue;
    const clave = `${v.canton}|${v.problema}`;
    grupos.set(clave, (grupos.get(clave) || 0) + 1);
  }
  return [...grupos]
    .filter(([, n]) => n >= minimo)
    .map(([clave, n]) => {
      const [canton, problema] = clave.split("|");
      return { canton, problema, n, dias };
    });
}
