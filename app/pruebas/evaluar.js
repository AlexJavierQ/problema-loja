// Evaluación reproducible de la prueba de concepto.
// Con el modelo cargado, en la consola del navegador:
//   const { evaluar } = await import("./pruebas/evaluar.js"); await evaluar();
// Deja el resultado en window.cafetalEvaluacion y lo imprime como tabla.
import * as motor from "../js/engine.js";

export async function evaluar(archivos = ["notas.js", "notas-b.js"]) {
  const salida = { modelo: motor.modeloCargado()?.id, conjuntos: {}, terminado: false };
  window.cafetalEvaluacion = salida;
  for (const archivo of archivos) {
    const { NOTAS } = await import(`./${archivo}?t=${Date.now()}`);
    const conjunto = { total: NOTAS.length, aciertos: 0, avisados: 0, filas: [] };
    salida.conjuntos[archivo] = conjunto;
    for (const caso of NOTAS) {
      try {
        const r = await motor.analizar(caso.nota);
        const acierto = r.registro.problema === caso.esperado;
        if (acierto) conjunto.aciertos += 1;
        // Un error "avisado" es uno que la app marcó con confianza baja o con un aviso visible.
        const avisado = !acierto && (r.registro.confianza === "baja" || r.registro.avisos.length > 0);
        if (avisado) conjunto.avisados += 1;
        conjunto.filas.push({
          esperado: caso.esperado,
          modelo: r.registro.problema,
          acierto,
          avisado,
          confianza: r.registro.confianza,
          citasValidas: r.registro.evidencias.length,
          citasPropuestas: (r.crudo.citas_de_la_nota || []).length,
          segundos: +r.medicion.segundos.toFixed(1),
          tokensPorSegundo: r.medicion.tokensPorSegundo ? Math.round(r.medicion.tokensPorSegundo) : null,
          solicitudesRed: r.medicion.solicitudesRed,
          reintentos: r.medicion.reintentos,
          explicacion: r.explicacion,
        });
      } catch (error) {
        conjunto.filas.push({ esperado: caso.esperado, error: String(error?.message || error) });
      }
    }
    const tiempos = conjunto.filas.map((f) => f.segundos).filter(Boolean);
    conjunto.segundosPromedio = +(tiempos.reduce((a, b) => a + b, 0) / tiempos.length).toFixed(1);
    conjunto.solicitudesRed = conjunto.filas.reduce((n, f) => n + (f.solicitudesRed || 0), 0);
    console.table(conjunto.filas.map(({ explicacion, ...resto }) => resto));
  }
  salida.terminado = true;
  return salida;
}
