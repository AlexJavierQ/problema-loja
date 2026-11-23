// Guía local: fichas técnicas resumidas. Viven dentro de la app y no se consultan en internet.
// Cada ficha resume, en palabras de campo, lo que dicen las fuentes enlazadas. No incluye dosis ni marcas.

export const CANTONES = [
  "Calvas",
  "Catamayo",
  "Celica",
  "Chaguarpamba",
  "Espíndola",
  "Gonzanamá",
  "Loja",
  "Macará",
  "Olmedo",
  "Paltas",
  "Pindal",
  "Puyango",
  "Quilanga",
  "Saraguro",
  "Sozoranga",
  "Zapotillo",
];

const F = {
  duicela2015: {
    corto: "Duicela y Ponce (2015)",
    referencia:
      "Duicela Guambi, L. A., y Ponce Vaca, L. A. (2015). Uso de fungicidas sistémicos en el control de la roya del cafeto en la provincia de Manabí. La Técnica, (15), 6–17.",
    url: "https://dialnet.unirioja.es/descarga/articulo/6087680.pdf",
  },
  iniap1995: {
    corto: "INIAP (1995)",
    referencia:
      "Sotomayor Herrera, I., y Duicela Guambi, L. (1995). Control integrado de las principales enfermedades foliares del cafeto en el Ecuador. INIAP, Estación Experimental Tropical Pichilingue.",
    url: "https://repositorio.iniap.gob.ec/server/api/core/bitstreams/bf740911-be2d-48ee-8cfb-3f664ae8b8eb/content",
  },
  iniap2023: {
    corto: "INIAP (2023)",
    referencia:
      "Instituto Nacional de Investigaciones Agropecuarias. (2023). Café arábigo. Vivero: manejo fitosanitario en vivero [Ficha técnica]. INIAP.",
    url: "https://tecnologia.iniap.gob.ec/wp-content/uploads/2023/11/fitovivero1.pdf",
  },
  cenRoya: {
    corto: "Cenicafé (2022a)",
    referencia:
      "Centro Nacional de Investigaciones de Café. (2022a). Roya del cafeto (Hemileia vastatrix). Manejo de la enfermedad [Infografía]. Cenicafé.",
    url: "https://publicaciones.cenicafe.org/index.php/infografias/article/view/2828",
  },
  cenBroca: {
    corto: "Cenicafé (s. f.)",
    referencia:
      "Centro Nacional de Investigaciones de Café. (s. f.). Manejo integrado de la broca (Cartilla cafetera n.º 14). Cenicafé.",
    url: "https://publicaciones.cenicafe.org/index.php/libros_manuales/article/download/3192/3213/2958",
  },
  vega2009: {
    corto: "Vega et al. (2009)",
    referencia:
      "Vega, F. E., Infante, F., Castillo, A., y Jaramillo, J. (2009). The coffee berry borer, Hypothenemus hampei: A short review, with recent findings and future research directions. Terrestrial Arthropod Reviews, 2, 129–147.",
    url: "https://www.ars.usda.gov/arsuserfiles/5818/TerrestrialArthropodReviews.pdf",
  },
  cenGotera: {
    corto: "Ángel Calle et al. (2018)",
    referencia:
      "Ángel Calle, C. A., Rivillas Osorio, C. A., Arciniegas Basante, N. del C., y López Vásquez, J. M. (2018). Bases para el manejo de la gotera u ojo de gallo del cafeto en Colombia (Avances Técnicos n.º 490). Cenicafé.",
    url: "https://publicaciones.cenicafe.org/index.php/avances_tecnicos/article/download/214/190/223",
  },
  cenGoteraInfo: {
    corto: "Cenicafé (2022c)",
    referencia:
      "Centro Nacional de Investigaciones de Café. (2022c). Gotera - Ojo de gallo (Mycena citricolor). Manejo de la enfermedad [Infografía]. Cenicafé.",
    url: "https://publicaciones.cenicafe.org/index.php/infografias/article/view/2825",
  },
  cenHierro: {
    corto: "Leguizamón-Caycedo (1997)",
    referencia: "Leguizamón-Caycedo, J. E. (1997). La mancha de hierro del cafeto (Avances Técnicos n.º 246). Cenicafé.",
    url: "https://publicaciones.cenicafe.org/index.php/avances_tecnicos/article/download/1880/5294/4010",
  },
  cenHierroInfo: {
    corto: "Cenicafé (2022b)",
    referencia:
      "Centro Nacional de Investigaciones de Café. (2022b). Mancha de hierro (Cercospora coffeicola). Factores que favorecen la enfermedad [Infografía]. Cenicafé.",
    url: "https://publicaciones.cenicafe.org/index.php/infografias/article/view/2863",
  },
};

export const FICHAS = [
  {
    id: "roya",
    partes: "hojas",
    nombre: "Roya del cafeto",
    cientifico: "Hemileia vastatrix",
    tipo: "hongo",
    sintomas: [
      "Manchas amarillas en la hoja que por el envés se cubren de un polvo anaranjado, en pústulas redondas de hasta un centímetro.",
      "Con el tiempo el polvo pasa de anaranjado a rojizo y marrón.",
      "Las hojas enfermas se caen antes de tiempo y la rama queda pelada.",
    ],
    condiciones: [
      "Más lluvia, más roya.",
      "Sombra excesiva, humedad alta, poca ventilación, malezas y cafetal mal podado.",
      "Variedades susceptibles como típica, caturra, bourbón y catuaí.",
    ],
    manejo: [
      "Al renovar el lote, sembrar variedades resistentes a la roya. Es la medida más eficaz.",
      "Regular la sombra y controlar las malezas a tiempo para que el cafetal se ventile.",
      "Fertilizar a tiempo, con base en un análisis de suelo.",
      "Anotar las fechas de las floraciones principales. Sirven para programar el control preventivo.",
      "Si hace falta fungicida, lo define el técnico. Los protectores sirven antes de que la enfermedad suba.",
    ],
    confirmar: [
      "Vire la hoja. El polvo anaranjado está en el envés, no en la cara de arriba.",
      "Si la mancha tiene el centro claro con un anillo rojizo y no suelta polvo, revise la ficha de mancha de hierro.",
    ],
    claves: ["roya", "polvo", "polvillo", "polvito", "anaranjad", "naranja", "amarill", "enves", "reves", "por debajo", "pustula", "pelada", "sin hojas", "cayendo las hojas", "caen las hojas"],
    fuentes: [F.duicela2015, F.cenRoya, F.iniap1995],
  },
  {
    id: "broca",
    partes: "frutos",
    nombre: "Broca del café",
    cientifico: "Hypothenemus hampei",
    tipo: "insecto",
    sintomas: [
      "Un agujero pequeño en el fruto, que hace la hembra al entrar.",
      "Por dentro, el grano tiene galerías con huevos y larvas que se lo comen.",
      "Frutos que se caen antes de tiempo y granos dañados que bajan la calidad del café.",
    ],
    condiciones: [
      "Frutos maduros, sobremaduros y secos que quedan en la planta después de la cosecha.",
      "Ataca frutos con más de 150 días de formados y entra más rápido en los maduros.",
    ],
    manejo: [
      "Hacer el repase (Re-Re): recoger los frutos maduros, sobremaduros y secos que quedan después de la cosecha.",
      "Revisar el lote cada mes. En una hectárea se evalúan 30 sitios, recorriendo en zigzag.",
      "No dejar pasar de 20 frutos brocados por cada 1 000 (2 %).",
      "Usar costales de fibra sintética bien amarrados para que la broca no escape del café cosechado.",
      "Control biológico con el hongo Beauveria o con avispitas. Las trampas con atrayente avisan cuándo la broca está volando.",
      "Insecticida solo si el nivel de broca lo justifica y de forma localizada, con el técnico.",
    ],
    confirmar: [
      "Abra varios frutos perforados. Debe ver las galerías en el grano y el insecto o sus larvas adentro.",
      "Revise también los frutos secos que quedaron en la planta después de la cosecha.",
    ],
    claves: ["broca", "brocad", "hueco", "huequito", "agujer", "orificio", "perfora", "picad", "gorgojo", "bichito", "grano", "cereza", "fruto", "galeria", "repase", "ombligo", "corona"],
    fuentes: [F.cenBroca, F.vega2009],
  },
  {
    id: "ojo_de_gallo",
    partes: "hojas y frutos",
    nombre: "Ojo de gallo o gotera",
    cientifico: "Mycena citricolor",
    tipo: "hongo",
    sintomas: [
      "Manchas circulares u ovaladas, de bordes bien definidos, de medio a un centímetro, en hojas y frutos.",
      "Empiezan rojizas o pardas y se vuelven gris claro al envejecer. A veces el centro se cae y deja un agujero.",
      "Sobre la mancha salen cabecitas en forma de alfiler, blancas o amarillas.",
      "Caída fuerte de hojas y caída prematura de frutos.",
    ],
    condiciones: [
      "Lluvias frecuentes y prolongadas, humedad relativa mayor al 80 %, mucha nubosidad y poco sol.",
      "Sombra excesiva y poca ventilación.",
    ],
    manejo: [
      "Regular la sombra al final de las épocas secas y de las húmedas.",
      "Manejar las malezas y otras plantas hospederas.",
      "Mantener los drenajes y podar las ramas bajas improductivas.",
      "Atender de inmediato los focos, cuando la incidencia todavía es menor al 10 %.",
      "No hay variedades resistentes. El fungicida es una alternativa en zonas críticas y lo define el técnico.",
    ],
    confirmar: [
      "Busque las cabecitas en forma de alfiler sobre las manchas. Son la señal propia de este hongo.",
      "La mancha no tiene polvo anaranjado por debajo. Si lo tiene, es roya.",
    ],
    claves: ["ojo de gallo", "gotera", "redond", "circul", "ovalad", "hundid", "gris", "ceniza", "cabecita", "alfiler", "neblina", "sombra", "hueco en", "huecos", "llovido", "lluvias", "llueve"],
    fuentes: [F.cenGotera, F.cenGoteraInfo],
  },
  {
    id: "mancha_de_hierro",
    partes: "hojas y frutos",
    nombre: "Mancha de hierro",
    cientifico: "Cercospora coffeicola",
    tipo: "hongo",
    sintomas: [
      "En la hoja, manchas circulares pequeñas de color pardo claro o marrón rojizo.",
      "Al crecer, el centro se pone blanquecino, con un anillo rojizo alrededor y un halo amarillento por fuera.",
      "En el fruto, la pulpa se pega al pergamino. Es el café que llaman pasilla o guayaba.",
    ],
    condiciones: ["Demasiado sol, falta de humedad y falta de nitrógeno.", "Plantas mal nutridas, en vivero o en producción."],
    manejo: [
      "Fertilizar según el análisis de suelo para vigorizar las plantas.",
      "Regular la sombra. En lotes nuevos, poner sombra provisional.",
      "Mantener una humedad adecuada en el suelo.",
      "En vivero, producir plantas con raíces sanas.",
      "Fungicida solo en cafetales de alta producción y con el técnico.",
    ],
    confirmar: [
      "Mire el centro de la mancha. Debe ser claro, con el anillo rojizo alrededor.",
      "Revise si el lote está a pleno sol o lleva tiempo sin abonar.",
    ],
    claves: ["mancha de hierro", "cercospora", "halo", "anillo", "borde amarill", "centro claro", "centro mas claro", "pleno sol", "sin sombra", "vivero", "pasilla", "guayaba", "desnutrid", "pega el sol", "da el sol"],
    fuentes: [F.cenHierro, F.iniap2023, F.cenHierroInfo],
  },
  {
    id: "mal_de_hilachas",
    partes: "ramas, hojas y frutos",
    nombre: "Mal de hilachas",
    cientifico: "Pellicularia koleroga",
    tipo: "hongo",
    sintomas: [
      "Un tejido blanquecino y sedoso cubre hojas y frutos tiernos. Al madurar se vuelve negruzco.",
      "Las hojas se secan y quedan colgando de hilachas.",
      "Empieza pegado al tallo y avanza hacia las puntas de las ramas. En casos avanzados se seca toda la rama.",
    ],
    condiciones: ["Sombra excesiva, humedad relativa alta y poca ventilación.", "Malezas abundantes y cafetal mal podado."],
    manejo: [
      "Poda fitosanitaria: eliminar el follaje enfermo después de la cosecha, junto con las podas.",
      "Regular la sombra y evitar el exceso.",
      "Sembrar a distancias apropiadas y controlar las malezas a tiempo.",
      "El fungicida, al inicio de la época lluviosa, lo define el técnico.",
    ],
    confirmar: [
      "Busque las hilachas que sostienen las hojas secas. Sin ellas no es esta enfermedad.",
      "Siga la rama hacia el tallo. El tejido blanquecino viene desde ahí.",
    ],
    claves: ["hilacha", "hilo", "hilito", "colgando", "colgad", "cuelgan", "telita", "telaran", "tela blanca", "sedos", "negruzc"],
    fuentes: [F.iniap2023, F.iniap1995],
  },
  {
    id: "minador",
    partes: "hojas",
    nombre: "Minador de la hoja",
    cientifico: "Perileucoptera coffeella",
    tipo: "insecto",
    sintomas: [
      "Galerías o minas visibles en la cara de arriba de la hoja.",
      "Dentro de la hoja vive la larva, que se come el tejido.",
      "Provoca caída de hojas.",
    ],
    condiciones: ["Cafetales con demasiado sol.", "Época seca.", "Después de un uso intensivo de agroquímicos contra la roya."],
    manejo: [
      "Dar sombra provisional con una especie de crecimiento rápido, como el fréjol de palo.",
      "Cuidar a los enemigos naturales. En Ecuador hay parasitoides y depredadores que regulan al minador.",
      "Evitar el uso intensivo de agroquímicos, que hace subir sus poblaciones.",
    ],
    confirmar: [
      "Levante la piel de la mancha. Debe encontrar la mina y la larva adentro.",
      "Revise si el lote está muy expuesto al sol.",
    ],
    claves: ["minador", "mina", "gusanito", "gusano", "larva", "quemad", "caminito", "piel de la", "verano", "epoca seca", "raspa"],
    fuentes: [F.iniap2023, F.iniap1995],
  },
];

export const EJEMPLOS = [
  {
    titulo: "Polvo anaranjado",
    productor: "Segundo Jiménez",
    canton: "Quilanga",
    nota: "Lote La Loma, café caturra, a unos 1650 metros. Las hojas de abajo tienen manchas amarillas y por el envés un polvito anaranjado. Ya se están cayendo las hojas en casi la mitad del lote.",
  },
  {
    titulo: "Grano perforado",
    productor: "Rosa Abad",
    canton: "Puyango",
    nota: "Lote junto a la quebrada. Encontré cerezas con un huequito en la punta y al abrirlas el grano está picado por dentro. De cada diez que revisé, dos o tres salen así. Quedaron frutos secos en las ramas de la cosecha pasada.",
  },
  {
    titulo: "Manchas redondas",
    productor: "Ángel Cueva",
    canton: "Espíndola",
    nota: "Parte baja de la finca, con mucha sombra, y ha llovido toda la semana. Las hojas tienen manchas redondas de color gris claro, con el borde bien marcado, y en algunas ya se cayó el centro y quedó el hueco. También hay manchas en los frutos.",
  },
  {
    titulo: "Nota sin síntomas",
    productor: "",
    canton: "Gonzanamá",
    nota: "El productor dice que las matas están tristes y que este año cargaron poco. No pude entrar al lote porque llovía y el camino estaba cortado.",
  },
];

const plano = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export const fichaPorId = (id) => FICHAS.find((f) => f.id === id) || null;

export function puntuarFichas(nota) {
  const texto = plano(nota);
  return FICHAS.map((ficha) => ({
    ficha,
    puntos: ficha.claves.reduce((suma, clave) => suma + (texto.includes(clave) ? clave.split(" ").length : 0), 0),
  })).sort((a, b) => b.puntos - a.puntos);
}

// Búsqueda local por palabras del campo. Sin IA: es rápida, explicable y funciona en cualquier equipo.
export function buscarFichas(nota, maximo = 3) {
  const puntuadas = puntuarFichas(nota);
  // Sin ninguna coincidencia no se descarta nada: el modelo ve toda la guía.
  if (puntuadas[0].puntos === 0) return [...FICHAS];
  // Siempre van varias candidatas, para que el modelo tenga que comparar y no solo confirmar.
  return puntuadas.slice(0, maximo).map((p) => p.ficha);
}
