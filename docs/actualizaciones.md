# Actualizaciones de documentos vigentes (fase 7)

Requerimiento §2.1 y §4.2, respuesta 5 de Procesos (versiones) y su propuesta para importar documentos
existentes; decisiones 32 y 33. Código: `src/services/Actualizaciones.gs` e `Importacion.gs`.

## El recorrido

1. **Nueva solicitud → «Actualizar un documento vigente».** Se busca el documento entre los vigentes de
   los departamentos de la persona (`documentosActualizables_`). No se puede si su tipo todavía no tiene
   plantilla o si ya hay otra actualización en curso del mismo documento.
2. **Se crea la solicitud** (`crearActualizacion_`) con el código, tipo, departamento y área del
   documento. Si nació en el sistema, se copia su contenido vigente para modificarlo: inicio, fin,
   objetivo, alcance, responsabilidades, definiciones y cada actividad con su responsable, enlaces e
   imágenes (`ID_ACTIVIDAD_BASE` recuerda de qué actividad vigente viene cada una). La versión queda
   «Por asignar».
3. **Si el documento no está en el sistema** (inventario anterior, cuando Procesos lo entregue) empieza
   vacía y el paso 3 sugiere **importar su Word o PDF** (abajo).
4. Se captura y se corrige con IA como cualquier solicitud.
5. **Control de cambios** (vista previa): el sistema compara con la versión vigente y **sugiere** los
   motivos (`motivosSugeridos_`): cambio de responsable, actividades agregadas o eliminadas. El
   colaborador los confirma y describe qué cambió; «Actualización completa del proceso» excluye a los
   demás. Sin motivo y descripción no se puede confirmar. No forma parte de la huella: cambiarlo no
   invalida la confirmación.
6. **Vo.Bo. de Procesos:** el revisor puede ajustar el control de cambios y elige **mayor** (1.0 → 2.0:
   cambian actividades, responsables, controles o estructura) o **menor** (1.0 → 1.1: redacción,
   aclaraciones o correcciones). El código se conserva (`siguienteVersion_`).
7. **Autorizada en CH:** el **mismo renglón** del inventario pasa a la versión nueva (`VERSION_VIGENTE`,
   `FECHA_VIGENCIA`, `ID_SOLICITUD_VIGENTE`) y se agrega al historial de versiones con sus motivos,
   descripción y quién autorizó. Hasta ese momento la versión vigente no cambia (§4.3).

En el documento, la tabla de **control de cambios** lleva todas las versiones autorizadas y, al final, la
de esta solicitud (el renglón de la plantilla se repite uno por cambio: `repetirFilaDeTabla_`).

## Importar un Word o PDF existente

En el paso 3, **«Importar Word o PDF»** (decisión 33): el archivo se guarda en
`Solicitudes/<folio>/Importados`, Google lo convierte a texto (los PDF con OCR) y la IA lo separa en
inicio, actividades con su responsable, fin y, si el documento los trae, objetivo, alcance,
responsabilidades y definiciones. Las reglas del prompt: solo lo que dice el documento, en el mismo orden,
sin inventar; ignora portada, encabezados, firmas y control de cambios. Lo que regresa se limpia
(`validarImportacion_`) y se muestra en una ventana para revisarlo; «Usar estas actividades» (o
«Reemplazar mis actividades» / «Agregarlas al final») lo pone en la captura como si se hubiera escrito.
Sin datos sensibles hacia la IA. Hasta `IMPORTACION_MB_MAX` MB; de un documento muy largo se leen los
primeros `IMPORTACION_MAX_CARACTERES` caracteres y se avisa.

Sirve también para un documento nuevo cuyo proceso ya estaba escrito en otro lado.

## Pendiente con Procesos

- El **inventario anterior** (pregunta J): al cargarlo, sus documentos entran con `ORIGEN = HISTORICO`
  y sin contenido en el sistema; su primera actualización se hace importando su Word o PDF.
- Validar como regla institucional el esquema de versiones (lo dejaron como propuesta).
