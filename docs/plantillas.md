# Plantillas y generación de documentos

## La regla

Todo archivo generado antes del **Vo.Bo. final** sale con «COPIA NO AUTORIZADA». El documento final
**es un archivo nuevo** generado desde la plantilla sin marca; los preliminares nunca se tocan
(requerimiento §4.4, decisiones 2 y 3 del [análisis](analisis-inicial.md#decisiones-tomadas)).

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
