# Hallazgos
Objetos perdidos y encontrados en cualquier ciudad. Una persona registra una pérdida y otra un hallazgo, en cualquier orden. Cada reporte abierto busca candidatos del tipo opuesto en la misma base de datos. Permite intercambiar mensajes privados de verificación y cerrar un reporte recuperado.

**[Abrir la demostración en Google Colab](https://colab.research.google.com/github/AlexJavierQ/problema-loja/blob/main/Demo.ipynb)**. Ejecuta las tres celdas con CPU y abre el enlace de la última. La app y sus datos viven en esa sesión. Dos entornos Colab independientes no comparten reportes.

## Frontend para Vercel
El directorio `app/` contiene un prototipo estático y adaptable a celular. La pestaña Explorar incluye cuatro objetos de muestra con fotografías de DummyJSON. Puedes crear ambos tipos de reporte, adjuntar una foto, consultar candidatos, ensayar conversaciones desde Mis reportes y cerrar un caso. Los datos se conservan en el navegador de la demo.

La comparación rápida usa palabras y sinónimos. El botón «Comparar con IA» descarga los modelos de descripción de imágenes y similitud multilingüe con Transformers.js y ejecuta la inferencia en el navegador. Requiere conexión en la primera carga. Para compartir una base entre varios dispositivos utiliza el servidor Python.

Para desplegar, importa este repositorio en Vercel desde la raíz. El archivo `vercel.json` selecciona `app/` como salida estática.

## Ejecutar con Python
Usa Python 3.11 o 3.12 de 64 bits. En un entorno virtual instala las dependencias y arranca el servidor:

```sh
python -m pip install -r requirements.txt
python hallazgos/servidor.py
```

Abre http://localhost:5180. La primera ejecución descarga unos 357 MiB de pesos y tokenizadores desde Hugging Face; los siguientes inicios reutilizan la caché. Para una demostración con dos equipos en la misma red de confianza, establece HOST=0.0.0.0 en el servidor y abre su dirección de red y puerto desde los dos dispositivos. Con las dependencias instaladas también puedes usar el comando anterior `node servidor.mjs`. Se puede configurar PORT, HALLA_DB (SQLite) y HALLA_MODELOS (caché).

## Recorrido de cinco minutos
1. Desde un navegador registra un hallazgo, con foto de un solo objeto y lugar aproximado. Agrega otros objetos para comparar.
2. Desde otro navegador conectado al mismo servidor describe la pérdida en español. También se pueden representar ambos roles en un único navegador.
3. Revisa los candidatos y la descripción visual automática en inglés. Si el reporte de pérdida se creó primero, usa «Actualizar coincidencias» después del hallazgo.
4. Envía una pregunta por una marca reservada, actualiza el otro reporte y responde. Tras confirmar la devolución, cierra el reporte para retirarlo de las búsquedas.

## Tecnología y límites
ViT + GPT-2 (nlpconnect, exportación ONNX de Xenova) genera un pie de foto. MiniLM multilingüe representa tanto ese pie como las descripciones escritas. Si hay ambos, el texto de la persona tiene peso doble. La similitud coseno selecciona candidatos a partir de 0,32; lugar coincidente y cercanía de fechas ayudan a ordenarlos. Se muestran hasta cinco. Son parámetros de demostración, no probabilidades de propiedad. Las descripciones de las fotos pueden omitir colores, marcas o accesorios.

Las claves privadas de los reportes quedan en el navegador. Borrar sus datos impide recuperar el acceso desde allí. El servidor conserva reportes, miniaturas sin metadatos y mensajes en SQLite. El prototipo está pensado para demostraciones con objetos de muestra. Un despliegue ciudadano requeriría gestión de cuentas, moderación, caducidad de datos, copias de seguridad y HTTPS.

La implementación actual está en `hallazgos/`. La práctica anterior se conserva en `historico/cafetal/`.
