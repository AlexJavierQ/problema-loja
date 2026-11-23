// Instrucciones que recibe el modelo local. Se muestran tal cual en "Cómo funciona".

export const SISTEMA_REGISTRO = `Eres un asistente técnico para fincas de café arábigo en la provincia de Loja, Ecuador. Funcionas dentro del equipo del técnico, sin internet.

Recibes FICHAS de la guía local y la NOTA de una visita. Devuelve un registro en JSON.

Reglas:
1. "citas_de_la_nota": copia de una a tres frases de la NOTA, palabra por palabra, que describan los síntomas. Nunca copies texto de las FICHAS.
2. "parte_afectada": la parte de la planta donde la NOTA describe el daño.
3. "problema": elige la ficha cuya parte dañada y cuyos síntomas coinciden con esas citas. No uses otro conocimiento.
4. Si la NOTA no describe síntomas, o no calzan con ninguna ficha, deja las citas vacías y responde "no_determinado".
5. Para lote, variedad, altitud y porcentaje escribe solo lo que la NOTA dice de forma explícita. Si no lo dice, null.
6. "severidad": leve si la NOTA habla de pocas plantas u hojas, moderada si es una parte del lote, alta si es la mayoría del lote o ya hay pérdida de cosecha. Si no lo dice, "no_indicada".`;

export const SISTEMA_EXPLICACION = `Eres un técnico cafetalero de Loja, Ecuador, y le habla a un productor. Trátelo de usted.

Explique en tres frases cortas y sencillas qué problema parece tener el cafetal y qué conviene hacer primero.

Use solo lo que dice la FICHA. No mencione productos químicos, marcas ni dosis. No salude ni se despida.`;

export function mensajesRegistro(nota, candidatas) {
  // Con toda la guía a la vista se manda solo lo esencial de cada ficha, para no alargar la lectura.
  const breve = candidatas.length > 3;
  const fichas = candidatas
    .map((f) =>
      breve
        ? `[${f.id}] ${f.nombre}. Daña: ${f.partes}. Se reconoce por: ${f.sintomas.slice(0, 2).join(" ")}`
        : `[${f.id}] ${f.nombre}. Daña: ${f.partes}. Se reconoce por: ${f.sintomas.join(" ")} Aparece cuando: ${f.condiciones.join(" ")}`,
    )
    .join("\n");
  return [
    { role: "system", content: SISTEMA_REGISTRO },
    {
      role: "user",
      content: `FICHAS\n${fichas}\n\nNOTA\n<<<\n${nota}\n>>>\n\nDevuelve el registro en JSON. Las citas salen de la NOTA.`,
    },
  ];
}

export function mensajesExplicacion(nota, ficha) {
  return [
    { role: "system", content: SISTEMA_EXPLICACION },
    {
      role: "user",
      content: `FICHA\n${ficha.nombre}. Síntomas: ${ficha.sintomas.join(" ")} Manejo: ${ficha.manejo.join(" ")}\n\nNOTA DEL TÉCNICO\n${nota}\n\nExplíquele al productor.`,
    },
  ];
}

// El esquema obliga al modelo a contestar con esta forma exacta.
// Las citas van primero: primero cita, después decide.
export function esquemaRegistro(ids) {
  const oNulo = (tipo) => ({ anyOf: [{ type: tipo }, { type: "null" }] });
  return {
    type: "object",
    properties: {
      citas_de_la_nota: { type: "array", items: { type: "string" }, maxItems: 3 },
      parte_afectada: { type: "string", enum: ["hojas", "frutos", "ramas", "raices", "varias", "no_indicada"] },
      problema: { type: "string", enum: [...ids, "no_determinado"] },
      confianza: { type: "string", enum: ["alta", "media", "baja"] },
      severidad: { type: "string", enum: ["leve", "moderada", "alta", "no_indicada"] },
      porcentaje_afectado: oNulo("number"),
      lote: oNulo("string"),
      variedad: oNulo("string"),
      altitud_msnm: oNulo("number"),
    },
    required: [
      "citas_de_la_nota",
      "parte_afectada",
      "problema",
      "confianza",
      "severidad",
      "porcentaje_afectado",
      "lote",
      "variedad",
      "altitud_msnm",
    ],
    additionalProperties: false,
  };
}

// Algunos modelos anteponen un bloque de razonamiento vacío; se retira antes de usar el texto.
export const sinRazonamiento = (texto) => texto.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim();
