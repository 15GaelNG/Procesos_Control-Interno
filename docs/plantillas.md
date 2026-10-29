# Plantillas y generación de documentos

## La regla

Todo archivo generado antes del **Vo.Bo. final** sale con «COPIA NO AUTORIZADA», incluido el PDF que
se carga en el sistema CH para las firmas. El documento final **es un archivo nuevo** generado desde
la plantilla sin marca cuando CH reporta «Autorizado»; los preliminares nunca se tocan
(requerimiento §4.4, decisiones 2, 3 y 10 del [análisis](analisis-inicial.md#decisiones-tomadas)).

## Una plantilla de Word, dos Google Docs

Procesos sube **un solo Word por tipo de documento**, con la marca de agua, a la carpeta `Plantillas`
del ambiente. `prepararPlantillas()` crea a partir de él:

| Google Doc | Cómo se obtiene | Se usa para |
|---|---|---|
| `<nombre> - Preliminar` | El Word tal cual | Todo lo que se genera antes del Vo.Bo. final |
| `<nombre> - Final` | El mismo Word sin la marca de agua | Solo el documento autorizado |

La marca se quita en el XML del Word (`quitarMarcaDeAguaXml_`): se busca el texto de
`Config → MARCA_AGUA_TEXTO` en los encabezados y se elimina el objeto que lo contiene (WordArt
clásico o forma moderna) con su run. Nada más del encabezado cambia. Está probado con los
encabezados reales de la plantilla (`tests/plantillas.test.js`) y verificado abriendo el resultado
en Word.

Si una plantilla ya convertida se quiere regenerar, se borra el Google Doc y se vuelve a correr
`prepararPlantillas()`; las que ya existen no se sobrescriben.

## Generación en el sistema (fase 4)

`generarPreliminar_` (`src/services/Documentos.gs`), desde la vista previa de una solicitud confirmada
(«Generar Word y PDF»):

1. Toma la plantilla **preliminar** del tipo de documento (`TiposDocumento.ID_PLANTILLA_PRELIMINAR`, o
   por nombre «Procedimiento - Preliminar»).
2. La copia en `Solicitudes/<folio>/Documentos` y la llena con `llenarPlantilla_` usando
   `datosDocumento_`:

   | Marcador | Valor en un preliminar de documento nuevo |
   |---|---|
   | `{{CODIGO}}` | «Por asignar» (Procesos lo asigna con su Vo.Bo.) |
   | `{{VERSION}}` · `{{CAMBIO_VERSION}}` | 0.0 (respuesta de Procesos sobre versiones) |
   | `{{FECHA_ACTUALIZACION}}` · `{{CAMBIO_FECHA}}` | Mes y año de la generación |
   | `{{CAMBIO_DESCRIPCION}}` · `{{CAMBIO_RESPONSABLE}}` | «Emisión inicial del documento.» · quien lo elaboró |
   | `{{ELABORO_*}}` | Nombre, puesto y fecha fijados al crear la solicitud (§4.1) |
   | `{{REVISO_*}}` · `{{AUTORIZO_*}}` | Vacíos hasta el Vo.Bo. de Procesos y el resultado de CH (fases 5 y 6) |
   | `{{PUESTOS}}` | «Puestos y responsabilidades» (decisión 25): cada responsable de las actividades, sin repetir, con lo que le toca («Puesto: …»). La sección cambia de título al llenarse y la de `{{RESPONSABILIDADES}}` se quita (va vacía), así que la plantilla no cambia |
   | `{{DESARROLLO}}` | Cada actividad con texto (las vacías no van), sus enlaces como ligas («Descripción: dirección») y su JPG con su pie |

   `tests/documentos.test.js` revisa que los datos cubran todos los marcadores del contrato.
3. Exporta **PDF y Word** (al colaborador, solo el PDF: decisión 29), los registra en `Archivos` con la
   huella del contenido y manda el Google Doc intermedio a la papelera de Drive.

Un doble clic no genera dos (aviso de 5 minutos en la caché). Si el contenido cambió después de
confirmar, no genera: pide volver a confirmar.

### Documento final (fase 6)

`generarFinal_`, cuando Procesos registra que CH autorizó ([autorizacion-ch.md](autorizacion-ch.md)).
Es el mismo llenado con la plantilla **sin marca** (`TiposDocumento.ID_PLANTILLA_FINAL`, o por nombre
«Procedimiento - Final»): un archivo **nuevo**, nunca un preliminar al que se le quita la leyenda (§4.4).
Cambia respecto al preliminar:

| Marcador | Valor en el final |
|---|---|
| `{{CODIGO}}` · `{{REVISO_*}}` | El código y quién dio el Vo.Bo. de Procesos |
| `{{AUTORIZO_*}}` | El autorizador final, su puesto y la fecha, como vienen en CH (decisión 14) |
| `{{FECHA_ACTUALIZACION}}` · `{{CAMBIO_FECHA}}` | Mes y año de la **autorización en CH**, no de la generación |

Los archivos van a `Archivos` con `TIPO = FINAL` y `CON_MARCA_AGUA = NO`, y el inventario apunta a ellos.

## Generación (fase 0: prueba de concepto)

`probarPlantillas()` copia cada plantilla, la llena con datos **de ejemplo** y la exporta a PDF y Word
en `Plantillas/Pruebas de generación`. El registro dice qué textos de la plantilla se pudieron
reemplazar y en qué sección (cuerpo, encabezados, pies).

Lo que se quiere averiguar:

1. **Fidelidad:** si la conversión a Google Docs conserva el marco, la portada, las fuentes (Century
   Gothic) y la marca de agua, en el PDF y en el Word exportado.
2. **Textos en cuadros de texto:** Google Docs convierte los cuadros de texto de Word en dibujos que
   el código no puede editar. Si algún texto de la portada o del encabezado sale «no se encontró», la
   plantilla tendrá que llevar ese dato en un párrafo o una tabla normal.
3. **Actividades e imágenes:** que se inserten en «04. Desarrollo» con buen tamaño.

Con el resultado se decide si se sigue con Google Docs (plan A) o se genera el Word directamente
desde su XML (plan B, ver [análisis §6.2](analisis-inicial.md#62-generación-del-wordpdf-y-la-marca-de-agua)).

## Resultados de la primera prueba (13/10/2026)

| Punto | Resultado |
|---|---|
| Marco, logo, portada y encabezado | ✔ Se conservan al convertir a Google Docs y en el PDF |
| Marca de agua | ✔ La Preliminar la muestra en diagonal; la Final sale sin ella |
| Cuerpo y tabla de firmas | ✔ Los textos se reemplazan |
| Actividades con imagen en «04. Desarrollo» | ✔ Se insertan con buen tamaño |
| Portada, encabezado y pie | ✘ No se pueden reemplazar (ver abajo) |
| Letra Century Gothic en el PDF | ✘ La «M» mayúscula salió rota («EJE\PLO»). La fuente sí viene completa dentro del Word, así que el problema es del PDF de Google. Se agregó una prueba con todo el abecedario para medirlo |

**Hallazgo importante de la plantilla:** los pies de página del Word están **vacíos**. El tipo de
documento, el nombre y el departamento (arriba) y el código, la versión, la fecha y el número de
página (abajo) **no están en el encabezado ni en el pie**: son cuadros de texto flotantes anclados al
cuerpo de la página 2. Por eso:

- el código no puede llenarlos (Google Docs los vuelve dibujos), y
- **solo aparecen en la página 2**: si el documento crece, la página 3 en adelante sale sin nombre,
  sin código y sin número de página. Además, «1 de 2» es texto fijo, no un número de página real.

La plantilla necesita una **versión 2** con el mismo diseño, pero con esos datos dentro del encabezado
y el pie reales (en tablas sin bordes), marcadores como `{{CODIGO}}` y número de página automático.
Hay que corregirla con cualquiera de los dos planes.

## Plantilla v2 de Procedimiento (13/10/2026)

Archivo: [`plantillas/Procedimiento.docx`](../plantillas/Procedimiento.docx). Se genera con
`tools/plantillas/crear-plantilla-v2.ps1` (controla Word por COM a partir de la plantilla original de
`docs/insumos/`), así que cualquier ajuste se hace en el script y se vuelve a generar:

```powershell
powershell -ExecutionPolicy Bypass -File tools\plantillas\crear-plantilla-v2.ps1
```

**Mismo diseño** que la original: marco, portada, logo, colores y marca de agua. Lo que cambia:

| Cambio | Por qué |
|---|---|
| Encabezado (tipo, nombre, departamento) y pie (código, versión, fecha, página) dentro del encabezado y pie **reales** | Antes eran cuadros de texto de la página 2: no se repetían ni se podían llenar |
| **Página x de y** automático | Antes «1 de 2» estaba escrito a mano. Se cuenta desde la portada (la portada es la 1) |
| Portada con nombre y código en párrafos | Los cuadros de texto no se pueden llenar desde Google Docs |
| Secciones nuevas: **4. Responsabilidades**, **5. Definiciones** (opcionales) y **7. Control de cambios** | Respuesta de Procesos (pregunta «secciones») |
| Firmas con nombre, **puesto y fecha** | Requerimiento §4.1 |
| Numeración pareja de secciones (1., 2., … en lugar de 1., 2., 3., 04., 05.) | Consistencia |
| Títulos que no se quedan solos al final de la página | Antes «Control y Responsables» quedaba separado de su tabla |
| Letra **Montserrat** en lugar de Century Gothic | La «M» y la «W» de Century Gothic salen rotas en los PDF de Google (prueba de letras del 13/10). Montserrat sale completa y se parece mucho |
| «ÚLTIMA ACTUALIZACIÓN» y «PÁGINA» con acento | Ortografía |

**Validada por Procesos (Marco) el 13/10/2026** con el PDF de prueba: 3 hojas, 26 de 26 marcadores
llenos, «Definiciones» vacía se quitó y las secciones se renumeraron solas.

> **Montserrat en Word:** los PDF y los Google Docs se ven bien porque Google trae Montserrat. Para
> que el Word se vea igual en una computadora, esa computadora necesita tener Montserrat instalada
> (es gratuita, de Google Fonts). Si no la tiene, Word la sustituye por otra letra parecida.

### Marcadores

El contrato entre la plantilla y el sistema es `MARCADORES_PLANTILLA` (`src/config/Config.gs`).
`tests/plantillas.test.js` lee el `.docx` real y falla si a la plantilla le falta un marcador o trae
uno que el sistema no conoce.

| Marcador | Dónde | Se llena con |
|---|---|---|
| `{{NOMBRE_PORTADA}}` · `{{CODIGO}}` | Portada (el código también en el pie) | Nombre en mayúsculas y código documental |
| `{{TIPO_DOCUMENTO}}` · `{{NOMBRE_DOCUMENTO}}` · `{{DEPARTAMENTO}}` | Encabezado | Datos generales |
| `{{VERSION}}` · `{{FECHA_ACTUALIZACION}}` | Pie | Versión y mes/año |
| `{{OBJETIVO}}` · `{{ALCANCE}}` | Secciones 1 y 2 | Textos confirmados |
| `{{PUESTOS}}` | Sección 3 (viñeta) | **Lista:** una viñeta por departamento o puesto |
| `{{RESPONSABILIDADES}}` · `{{DEFINICIONES}}` | Secciones 4 y 5 | **Lista opcional:** si viene vacía se quita la sección y se renumeran las demás. «Puesto: texto» pone el puesto en negritas |
| `{{DESARROLLO}}` | Sección 6 | Las actividades: «Actividad n · Responsable», descripción e imágenes centradas con pie «Imagen n.m» |
| `{{CAMBIO_VERSION}}` · `{{CAMBIO_FECHA}}` · `{{CAMBIO_DESCRIPCION}}` · `{{CAMBIO_RESPONSABLE}}` | Tabla de control de cambios | Por ahora un renglón; el historial completo se agrega con las actualizaciones (fase 7) |
| `{{ELABORO_*}}` · `{{REVISO_*}}` · `{{AUTORIZO_*}}` · `{{FECHA_*}}` | Tabla de firmas | Nombre, puesto y fecha de cada acción. Autorizó y su fecha vienen de CH |

El llenado está en `src/documentos/Llenado.gs` (`llenarPlantilla_`). Conserva el formato de cada
marcador y nunca modifica la plantilla: siempre trabaja sobre una copia.

## Documentos largos y cortos, e imágenes

- **El documento crece con el contenido.** No hay nada de tamaño fijo: las actividades e imágenes se
  insertan donde está `{{DESARROLLO}}`, el texto pasa solo a la hoja siguiente, el encabezado y el pie
  se repiten y «Página x de y» se calcula. Un proceso corto sale de 3 hojas (portada + 2).
- **Imágenes por actividad:** varias por actividad (tope en `Config → IMG_MAX_POR_ACTIVIDAD`), debajo
  de la descripción, centradas y con pie «Imagen n.m». Ligadas a su actividad por ID, así que
  reordenar actividades no las revuelve. El colaborador las sube o las pega con Ctrl+V (fase 2); el
  navegador las optimiza antes de subirlas (ancho máx. 1600 px, ~300 KB).
- **Tamaño en el documento** (`tamanoImagen_`, probado en `tests/plantillas.test.js`): caben en
  **560 × 600 px** de Google Docs (≈ 5.8 × 6.25 pulgadas) sin deformarse y nunca se agrandan. Las
  horizontales ocupan casi todo el ancho para que se lea la letra chica; las verticales (capturas de
  celular) se limitan por el alto para no salirse de la hoja.
- **Prueba de carga:** `probarDocumentoLargo()` genera un procedimiento de 40 actividades con imágenes
  horizontales y verticales, y reporta hojas, peso y cuánto tarda cada paso (llenar, PDF, Word), para
  confirmar que queda lejos del límite de 6 minutos de Apps Script.
