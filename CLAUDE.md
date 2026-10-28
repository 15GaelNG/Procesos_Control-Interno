# Procesos — cómo trabajamos

Sistema de Documentación de Procesos de Ciudad Maderas (para el área de Procesos): Google Apps
Script ligado a la hoja **BD Procesos** (y su copia de pruebas). Qué es, decisiones y plan en
`docs/analisis-inicial.md`; requerimientos oficiales en `docs/insumos/requerimientos.md`.

## Idioma
- Todo lo que se le dice a Gael, la documentación y los commits van **en español**.

## Fuente de verdad
- **El documento de requerimientos manda** (`docs/insumos/requerimientos.md`) sobre la infografía y
  sobre lo platicado, **precisado por las respuestas de Procesos** (`docs/insumos/respuestas-procesos.md`),
  que mandan donde lo contradicen. Las decisiones vigentes están en `docs/analisis-inicial.md`; si
  algo no está claro, se pregunta y se anota ahí.
- **Este sistema llega hasta el Vo.Bo. de Procesos.** Las autorizaciones del responsable y del
  director se dan en el **sistema CH** (Capital Humano); aquí no se duplican.
- La marca «COPIA NO AUTORIZADA» se quita **solo cuando CH reporta «Autorizado»**, nunca con la
  validación de Procesos. El final es un archivo nuevo desde la plantilla sin marca.
- Se construye primero el tipo **Procedimiento**; los demás tipos, cuando Procesos dé sus plantillas.
- La IA **propone y la persona decide**; nunca inventa responsables, actividades, tiempos ni
  requisitos, y nunca reordena actividades por su cuenta (§3.3, §3.4).

## Ambientes (ver docs/ambientes.md)
| | Proyecto | Comando |
|---|---|---|
| Pruebas | BD Procesos - PRUEBAS (`.clasp.json`) | `npm run pruebas -- "qué cambió"` |
| Producción | BD Procesos (`.clasp.prod.json`) | `npm run produccion -- "qué cambió"` |

- Todo cambio va primero a **pruebas**; a producción solo cuando Gael lo valida y desde un commit.
- **Nunca editar en el editor de Apps Script**: clasp reemplaza el proyecto completo.
- No levantar servidores locales para probar: se prueba con node (`npm test`, que carga los `.gs`
  con `tests/cargar-gs.js`) y Gael revisa en pruebas. Lo que no use servicios de Google debe tener
  su prueba.

## Reglas del código
- Las constantes de nivel superior van en `src/config/`. Una constante declarada dos veces tira todo
  el servidor. Una constante **no debe leer otra de otro archivo** al declararse (Apps Script no
  garantiza el orden de carga); dentro de funciones sí se puede.
- Las funciones que el navegador no debe llamar terminan en `_`.
- La base de datos se define solo en `src/config/Esquema.gs`; si cambia, se actualiza
  `docs/base-de-datos.md` en el mismo commit. En hojas con datos, columnas nuevas siempre al final;
  lo que ya no se usa va en `columnasRetiradas` / `HOJAS_RETIRADAS` (se quita solo si está vacío) y
  un valor sembrado que cambia, en `CORRECCIONES_BD`. La base se actualiza corriendo otra vez la
  instalación.
- Toda función del editor (sin `_` al final y que no sea de la app) empieza con `soloEditor_()`: la
  web app corre como la cuenta dueña y cualquiera podría llamarla desde el navegador.
- El navegador solo llama funciones `api…` de `src/ClientApi.gs`. Cada una recibe primero
  `comoUsuario`, pide la sesión con `sesionEfectiva_(comoUsuario)` (nunca con `sesionActual_` ni
  confiando en lo que mande el navegador) y revisa permisos con `requierePerfil_`.
- **Soporte CI solo consulta:** una función `api…` que escribe nunca incluye `SOPORTE_CI` en su
  `requierePerfil_`. No hay superusuario (decisión 19).
- Toda acción relevante se anota con `registrarBitacora_(sesion, ACCION, detalle)`, que guarda a la
  persona real aunque use «Ver como». Las acciones nuevas llevan su nombre en `NOMBRES_ACCION`.
- Qué pantallas ve cada perfil: `MODULOS_APP` (`src/config/Catalogos.gs`), probado en
  `tests/base.test.js`.
- `src/config/CatalogoInicial.gs` es **generado** (`npm run catalogo` desde
  `docs/insumos/catalogo-departamentos-areas.xlsx`); no se edita a mano. `tests/catalogo.test.js`
  falla si no coincide con el Excel.
- Todo cambio al **contenido** de una solicitud termina en `aplicarCambioContenido_` (nueva marca, nueva
  huella y, si estaba CONFIRMADA, regresa a BORRADOR). No escribir el contenido por otro camino.
- Lo que va a la IA pasa antes por `ocultarDatosSensibles_`; lo que regresa, por `validarAnalisis_` y
  `restaurarDatosSensibles_`. Nunca se usa directo.
- Se lee y escribe por **nombre de columna** (`leerTabla_`, `agregarFila_`, `actualizarFila_`). Las hojas de
  `TABLAS_ESTABLES` (usuarios, catálogos, Config) se recuerdan entre llamadas (caché del script); antes de
  escribir una de ellas por número de renglón se lee con `leerTablaFresca_`. `onEdit` (Disparadores.gs)
  solo borra esa memoria cuando alguien edita la hoja a mano; es la única función pública sin `soloEditor_()`
  fuera de la app. Dentro de una llamada cada hoja se lee una vez y lo escrito se aplica a lo recordado.
- Todo bloqueo va con `conCandado_(ms, fn)` (nunca `LockService` directo): se puede anidar sin soltar el de
  afuera, bajo él la primera lectura de cada hoja de operación es fresca y al soltarlo se confirman las
  escrituras. Lo que se decide con datos que otra persona pudo cambiar (consecutivos, tomar, Vo.Bo.) va adentro.
- Nada se borra físicamente: `ACTIVO = NO` o `ELIMINADA = SI`.
- Plantillas: el contrato con el generador son los marcadores `{{...}}` de `MARCADORES_PLANTILLA`
  (`src/config/Config.gs`). La plantilla v2 se genera con `tools/plantillas/crear-plantilla-v2.ps1`;
  no se edita a mano. `tests/plantillas.test.js` revisa que el `.docx` y el contrato coincidan.
- Los `.ps1` se guardan en UTF-8 **con BOM** (PowerShell 5 lee sin BOM como ANSI y rompe los acentos).
- Los IDs de carpetas, ambiente y llave de la IA viven en las Propiedades del script, nunca en el
  código. La llave de la IA jamás va al repo, a la hoja ni al navegador.

## Trampas de Apps Script en archivos `.html` (aprendidas en Control Interno)
- **Nunca `//` seguido de texto en código real de un `.html`:** Apps Script lo toma como comentario
  aunque esté dentro de un string y corta la línea. Las URLs en JS van como `'https:\/\/…'`.
- **Nunca `/*` dentro de un string** (p. ej. `accept="image/*"` en JS): se come hasta el siguiente `*/`.
- **Nunca escribir los símbolos de scriptlet** (menor-que + signo de interrogación, y su cierre)
  dentro de un `.html` que se evalúa como plantilla, ni siquiera en un comentario.
