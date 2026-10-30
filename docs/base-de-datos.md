# Base de datos

Cada ambiente usa una hoja de Google Sheets (`BD Procesos` / `BD Procesos - PRUEBAS`). La estructura
la define **`src/config/Esquema.gs`** y la crea `instalarPruebas()` / `instalarProduccion()`; este
documento explica para qué sirve cada hoja y cada columna. **Si cambias el esquema, cambia este
documento en el mismo commit.**

## Reglas generales

- **El nombre de cada hoja y de cada columna es contrato con el código.** El código busca columnas
  por su encabezado (no por posición), pero renombrar una lo rompe.
- **En una hoja con datos, las columnas nuevas van al final.** La instalación las agrega sin tocar
  los datos ([cómo se actualiza](#cómo-se-actualiza)).
- **IDs de texto con prefijo** (`USR-0001`, `SOL-2026-0001`). Los asigna `siguienteId_()` con
  bloqueo, a partir de la hoja `Consecutivos`. Nunca se reutilizan.
- **Nada se borra:** los registros se desactivan (`ACTIVO = NO`) o se marcan (`ELIMINADA = SI`),
  para no perder trazabilidad.
- **Todo se guarda como texto** (así `1.0` no se vuelve `1` ni `0001` se vuelve `1`), excepto las
  columnas que empiezan con `FECHA`, que llevan formato de fecha y hora.
- **Nombre y puesto se copian** al momento de cada firma (elaboró, revisó, autorizó): si la persona
  cambia de puesto después, el documento autorizado no cambia (requerimiento §4.1).
- Valores sí/no: `SI` / `NO`.
- Las pestañas tienen color por grupo: gris = configuración, dorado = catálogos, azul = operación,
  café = trazabilidad. La nota de la celda A1 de cada hoja dice para qué sirve.

## Relaciones

```
Usuarios ─┬─< UsuarioPerfiles            Departamentos ─┬─< Areas
          └─< UsuarioDepartamentos >────────────────────┤
                                                        └─< Puestos
TiposDocumento · Departamentos · Areas ──> código documental (P-CM01-001)
Documentos (inventario) ─< Solicitudes ─┬─< Actividades ─< Imagenes
                       └─< HistorialCambios ├─< Aclaraciones · PropuestasIA · Observaciones
                                            ├─< EnviosCH · Archivos · Instantaneas
                                            └─< Bitacora · UsoIA
```

## Cómo se actualiza

La estructura se actualiza corriendo otra vez `instalarPruebas()` / `instalarProduccion()`, que
nunca borra datos:

| Caso | Qué hace |
|---|---|
| Hoja nueva en el esquema | La crea |
| Hoja **sin datos** cuyos encabezados no coinciden | Los reescribe en el orden del esquema |
| Hoja **con datos** | Agrega al final las columnas que falten |
| Columna en `columnasRetiradas` | La quita si está vacía; si tiene datos, la deja y avisa |
| Hoja en `HOJAS_RETIRADAS` | La borra si está vacía o solo tiene su semilla original; si no, la oculta como «(retirada) …» |
| Filas semilla | Agrega las que falten y llena sus celdas **vacías** (un valor cambiado a mano se respeta) |
| `CORRECCIONES_BD` | Cambia un valor sembrado solo si la celda conserva el valor viejo |

### Catálogo de Procesos (19/10/2026)

- `Areas` con `OBSERVACIONES`; nueva hoja **`Subareas`**; `ID_SUBAREA` en `Solicitudes` y
  `Documentos`. Los datos se cargan con `importarCatalogoInicial()` ([catalogos.md](catalogos.md)); desde
  el 21/10/2026, de la lista maestra corregida (sin cambios en las hojas).

### Cambios de la fase 1 (14/10/2026), por las respuestas de Procesos

- **Nueva hoja `Areas`** y `ID_AREA` en `Solicitudes` y `Documentos`, para armar el código
  `P-CM01-001` (decisión 11).
- **`TiposDocumento`:** prefijos M, P, PRO, PL, F y DP; columna `EN_SISTEMA` (solo Procedimiento por
  ahora). Se corrige Procedimiento de `PRO` a `P`.
- **Sin autorizaciones internas** (decisión 10): se retiran `CadenasAutorizacion`, `Autorizaciones`
  y la columna `UsuarioPerfiles.NIVEL_AUTORIZACION`. Entra **`EnviosCH`** (decisión 15).
- **`Solicitudes`:** revisor asignado, descripción y tipo de cambio (mayor/menor).
- **`HistorialCambios`:** responsable de la modificación.

---

## Configuración---

## Configuración

### Config
Parámetros que se pueden ajustar sin tocar código: `CLAVE` · `VALOR` · `DESCRIPCION`.

| Clave | Valor inicial | Para qué |
|---|---|---|
| `MARCA_AGUA_TEXTO` | COPIA NO AUTORIZADA | Leyenda de los preliminares |
| `IMG_ANCHO_MAX` · `IMG_CALIDAD` · `IMG_PESO_OBJETIVO_KB` | 1600 · 0.82 · 300 | Optimización de imágenes (§3.2) |
| `IMG_MAX_POR_ACTIVIDAD` | 10 | Tope de imágenes por actividad |
| `IA_ACTIVA` | NO | Interruptor de la IA; con NO el sistema funciona sin sugerencias |
| `IA_PROVEEDOR` · `IA_MODELO` | GEMINI · (por definir) | Ver [ia.md](ia.md) |
| `IA_MAX_LLAMADAS_DIA` | 200 | Tope diario para no rebasar la cuota gratuita |
| `IA_SUGERIR_AL_ESCRIBIR` | SI | La IA sugiere la redacción de cada actividad mientras se escribe (paso 3) |
| `IA_MAX_SUGERENCIAS_DIA` | 800 | Tope diario de esas sugerencias (aparte del de análisis) |
| `PREFIJO_SOLICITUD` | SOL | Prefijo del folio interno |
| `CORREO_PROCESOS` | (vacío) | Correo(s) del área de Procesos para avisos (separados por coma); además se avisa a todos los revisores activos |
| `AVISOS_CORREO` | SI | Avisos por correo de cada etapa (decisión 27, [revision.md](revision.md#avisos-por-correo)); `NO` los apaga |

La llave de la IA **no** va aquí: va en las Propiedades del script ([ambientes.md](ambientes.md)).

### Consecutivos
`SERIE` · `ULTIMO` · `FECHA_ACTUALIZACION`. Último número usado por cada serie (`USR`, `SOL-2026`…).
No se edita a mano. Los códigos documentales llevan su propia serie por tipo + departamento + área
(`COD-P-CI04`): avanza al dar el Vo.Bo. hasta el número usado ([revision.md](revision.md#código)).

---

## Catálogos

### Usuarios
`ID_USUARIO` · `CORREO` (cuenta de Google con la que entra) · `NOMBRE` · `ID_PUESTO` · `ACTIVO` ·
`FECHA_ALTA` · `ACTUALIZADO_POR` · `FECHA_ACTUALIZACION`

### UsuarioPerfiles
Una persona puede tener varios perfiles (§1). `ID_USUARIO_PERFIL` · `ID_USUARIO` · `PERFIL`
(`COLABORADOR`, `REVISOR`, `ADMINISTRADOR`, `SOPORTE_CI`) · `ID_DEPARTAMENTO` (alcance; vacío = todos) ·
`ACTIVO` · `FECHA_ALTA`.
Ser `ADMINISTRADOR` no da permiso de revisar y `SOPORTE_CI` solo consulta (decisión 19). No hay perfil
de autorizador: el responsable y el director autorizan en el sistema CH (decisión 10). Quitar un
perfil no borra el renglón: queda con `ACTIVO = NO`; volver a darlo agrega un renglón nuevo, así se ve
la historia.

### UsuarioDepartamentos
Departamentos por los que una persona puede elaborar documentos; si tiene varios, elige al crear la
solicitud (§2). `ID_USUARIO_DEPARTAMENTO` · `ID_USUARIO` · `ID_DEPARTAMENTO` · `PRINCIPAL` (el que se
propone por defecto) · `ACTIVO`.

### Departamentos
`ID_DEPARTAMENTO` (`DEP-001`) · `NOMBRE` · `CLAVE_CODIGO` (su nomenclatura en el código documental: `CI`
en `P-CI04-001`) · `DIRECCION` · `ACTIVO`.

### Areas
Áreas de cada departamento. `ID_AREA` (`ARE-0001`) · `ID_DEPARTAMENTO` · `NOMBRE` · `CLAVE_CODIGO`
(su parte del código, a dos dígitos: `04` en `P-CI04-001`) · `ACTIVO` · `OBSERVACIONES` (notas del
catálogo de Procesos: de dónde salió la clave, decisiones pendientes). El código de un documento es
`PREFIJO_CODIGO` del tipo + `-` + clave del departamento + clave del área + `-` + consecutivo
(decisión 11; el alcance del consecutivo está pendiente con Procesos, pregunta F). Se cargan con
`importarCatalogoInicial()` ([catalogos.md](catalogos.md)).

### Subareas
Subáreas de un área (catálogo de Procesos). **No cambian el código**: heredan la clave de su área
(Procesos es subárea de Análisis de Datos y Procesos y usa `CI04`). `ID_SUBAREA` (`SUB-0001`) ·
`ID_AREA` · `NOMBRE` · `CLAVE_ANTERIOR` (el cuerpo que tenía antes de volverse subárea; la lista maestra
del 21/10/2026 no lo trae, así que por ahora queda vacía) ·
`ACTIVO` · `OBSERVACIONES`. Sirven para saber de qué equipo es cada documento.

### Puestos
`ID_PUESTO` · `NOMBRE` · `ID_DEPARTAMENTO` · `SINONIMOS` (otras formas de llamarlo, separadas por
coma: ayudan a la IA a reconocer al responsable) · `ACTIVO`.

### TiposDocumento
`ID_TIPO` · `NOMBRE` · `PREFIJO_CODIGO` · `ID_PLANTILLA_PRELIMINAR` · `ID_PLANTILLA_FINAL` · `ACTIVO` ·
`EN_SISTEMA` (`SI` = ya se documenta en este sistema porque tiene plantilla validada).

| ID | Tipo | Prefijo | En el sistema |
|---|---|---|---|
| TD-01 | Manual | M | NO (falta su plantilla) |
| TD-02 | Procedimiento | P | **SI** (plantilla v2) |
| TD-03 | Protocolo | PRO | NO (falta su plantilla) |
| TD-04 | Política | PL | NO (falta su plantilla) |
| TD-05 | Formato | F | NO (pregunta H) |
| TD-06 | Diagrama de proceso | DP | NO (pregunta H) |

Cada tipo tiene **dos** plantillas: la preliminar con «COPIA NO AUTORIZADA» y la final sin marca.
`prepararPlantillas()` guarda sus IDs aquí (el Word «Procedimiento.docx» se liga al tipo «Procedimiento»);
si faltan, la generación las busca por nombre en la carpeta Plantillas.

---

## Operación---

## Operación

### Documentos — inventario documental
Un renglón por documento oficial. `ID_DOCUMENTO` · `CODIGO` · `NOMBRE` · `ID_TIPO` ·
`ID_DEPARTAMENTO` · `ID_AREA` · `ID_SUBAREA` · `VERSION_VIGENTE` · `FECHA_VIGENCIA` · `ESTATUS` (`VIGENTE` / `OBSOLETO`) ·
`ID_SOLICITUD_VIGENTE` (la que lo autorizó) · `ID_ARCHIVO_WORD` · `ID_ARCHIVO_PDF` ·
`CONTENIDO_ESTRUCTURADO` (`SI` si nació en el sistema y se puede actualizar actividad por actividad) ·
`ORIGEN` (`SISTEMA` o `HISTORICO`, para los que se carguen del inventario actual de Procesos) ·
`FECHA_REGISTRO`. `ID_DOCUMENTO` es `DOC-0001`. Desde la fase 6, un documento nuevo entra aquí cuando
Procesos registra que CH lo autorizó, y sus archivos finales se ligan al generarse
([autorizacion-ch.md](autorizacion-ch.md)).
Mientras una actualización está en curso, este renglón **no cambia**; solo se actualiza cuando CH
autoriza.

### Solicitudes
Cada trámite, de borrador hasta el resultado de CH.

| Columnas | Qué guardan |
|---|---|
| `ID_SOLICITUD` | Folio interno `SOL-2026-0001`; existe aunque nunca se asigne código oficial |
| `TIPO_SOLICITUD` · `ID_TIPO` · `ID_DOCUMENTO` | Nuevo o actualización; tipo de documento; documento que se actualiza |
| `NOMBRE_DOCUMENTO` · `ID_DEPARTAMENTO` · `ID_AREA` · `ID_SUBAREA` | Datos generales (departamento y área arman el código; la subárea es opcional) |
| `ESTADO` · `REVISOR_ASIGNADO_ID` | Dónde va ([estados](analisis-inicial.md#32-estados-de-una-solicitud-actualizados-con-las-respuestas-de-procesos)) y qué revisor de Procesos la tiene |
| `INICIO_PROCESO` · `FIN_PROCESO` | Respuestas a «¿Qué sucede para que inicie?» y «¿Cómo finaliza?» |
| `OBJETIVO` · `ALCANCE` · `RESPONSABILIDADES` · `DEFINICIONES` | Textos derivados. Los dos últimos son listas JSON de renglones «Puesto: …» / «Término: …» (en el documento el texto antes de los dos puntos va en negritas) |
| `MOTIVOS_CAMBIO` · `DESCRIPCION_CAMBIO` | Solo actualizaciones: motivos (§4.2; lista JSON de claves de `MOTIVOS_CAMBIO`: `CAMBIO_RESPONSABLE`, `ACTIVIDADES_AGREGADAS`, `ACTIVIDADES_ELIMINADAS` o `COMPLETA`) y qué cambió. Ver [actualizaciones.md](actualizaciones.md) |
| `TIPO_CAMBIO` | `MAYOR` o `MENOR`; lo decide Procesos al dar el Vo.Bo. de una actualización |
| `CODIGO` · `VERSION` | Se asignan con el Vo.Bo. de Procesos; la versión se vuelve oficial cuando CH autoriza |
| `REVISION` | Vueltas de revisión (1, 2, 3…); no es la versión oficial |
| `HUELLA_CONTENIDO` · `HUELLA_CONFIRMADA` · `FECHA_CONFIRMACION` | Huella del contenido actual y del que confirmó el colaborador; si no coinciden, hay que volver a confirmar (§3.5) |
| `ELABORO_*` · `REVISO_*` y sus fechas | Nombre y puesto fijados al momento de cada acción (§4.1) |
| `AUTORIZO_NOMBRE` · `AUTORIZO_PUESTO` · `FECHA_AUTORIZACION` | El autorizador final según CH, que registra Procesos (decisiones 14 y 15) |
| `MOTIVO_CIERRE` | Por qué se cerró como no procedente |
| `ID_CARPETA` · `FECHA_ACTUALIZACION` | Carpeta de la solicitud en Drive; último cambio |
| `FECHA_ENVIO_REVISION` | Último envío a revisión de Procesos (ordena la bandeja por tiempo de espera). Columna nueva de la fase 5, al final |
| `HUELLA_REVISOR` | Huella del contenido como lo dejó Procesos al corregirlo durante la revisión: también se puede autorizar (decisión 26). Columna nueva del 29/10/2026, al final |

### Actividades
`ID_ACTIVIDAD` · `ID_SOLICITUD` · `ORDEN` (lo define el colaborador; la IA no lo cambia) ·
`TEXTO_ORIGINAL` (lo que escribió el colaborador) · `TEXTO_FINAL` (la redacción de la IA que aceptó o
editó; si está vacío, al documento va `TEXTO_ORIGINAL`. Si después edita el texto a mano, se guarda en
`TEXTO_ORIGINAL` y `TEXTO_FINAL` se vacía) · `ID_PUESTO` (del catálogo, si coincide) · `PUESTO_TEXTO` (el
responsable como quedó: escrito por el colaborador, aceptado de la IA o respondido a la pregunta) ·
`RESPONSABLE_CONFIRMADO` (`SI` cuando lo aceptó o respondió en el análisis; cambiarlo a mano lo regresa
a `NO`) · `ELIMINADA` · `FECHA_ACTUALIZACION` · `ENLACES` (lista JSON de `{ url, texto }`: páginas,
carpetas o sistemas que usa la actividad; solo http/https. Columna nueva del 29/10/2026, al final; decisión 31) ·
`ID_ACTIVIDAD_BASE` (en una actualización, la actividad de la versión vigente de la que se copió; sirve para
sugerir los motivos del control de cambios. Columna nueva del 29/10/2026, al final; fase 7).
Cuando Procesos corrige el texto de una actividad, va a `TEXTO_FINAL` y `TEXTO_ORIGINAL` conserva el del colaborador.

### Imagenes
`ID_IMAGEN` · `ID_ACTIVIDAD` · `ID_SOLICITUD` · `ORDEN` (dentro de la actividad) · `ID_ARCHIVO` (WebP
para la app) · `ID_ARCHIVO_DOCUMENTO` (JPG para Word/PDF) · `FORMATO` (del archivo de la app: `WEBP`, o
`JPEG` si el navegador no sabe crear WebP) · `ANCHO` · `ALTO` · `PESO_KB` · `PIE` · `ELIMINADA` ·
`FECHA_CARGA` · `ID_ARCHIVO_MINIATURA` (WebP de 360 px para la captura).
Se ligan a la actividad por ID: reordenar actividades nunca rompe la relación (§3.2). Cómo se optimizan:
[captura.md](captura.md#imágenes-32).

### Aclaraciones
Preguntas complementarias. `ID_ACLARACION` · `ID_SOLICITUD` · `ID_ACTIVIDAD` (vacío = general) ·
`TIPO` (responsable, autorización, excepción, plazo, documento…) · `PREGUNTA` · `RESPUESTA` · `ESTADO`
(`PENDIENTE`, `RESPONDIDA`, `NO_APLICA`, `NO_LO_SE`, o `REEMPLAZADA` si quedó sin responder y un análisis
nuevo la sustituyó) · `ORIGEN` (`IA` o `PROCESOS`) · `FECHA_PREGUNTA` · `FECHA_RESPUESTA`.
Las respondidas se mandan a la IA en el siguiente análisis para que no las repita. Responder la pregunta
del responsable deja esa respuesta como responsable de la actividad.

### PropuestasIA
Lo que propuso la IA y qué decidió la persona: la IA propone, la persona decide. `ID_PROPUESTA` ·
`ID_SOLICITUD` · `ID_ACTIVIDAD` · `CAMPO` (`TEXTO`, `RESPONSABLE`, `OBJETIVO`, `ALCANCE`,
`RESPONSABILIDADES`, `DEFINICIONES` (estas dos como lista JSON) u `ORDEN`, que solo informa: la IA nunca
reordena) · `VALOR_ANTERIOR` (lo que había al analizar; si la actividad cambió después, la propuesta ya
no se puede aceptar) · `PROPUESTA` · `JUSTIFICACION` (incluye el aviso si menciona cifras que no estaban
en el texto) · `EVIDENCIA` (fragmento del texto del colaborador que la sustenta) · `DECISION`
(`PENDIENTE`, `ACEPTADA`, `EDITADA`, `RECHAZADA`, o `REEMPLAZADA` si un análisis nuevo la sustituyó) ·
`VALOR_FINAL` · `FECHA_PROPUESTA` · `FECHA_DECISION`.

### Observaciones
De Procesos. `ID_OBSERVACION` (`OBS-000001`) · `ID_SOLICITUD` · `REVISION` (vuelta en que se hizo) ·
`APARTADO` (`GENERAL`, `NOMBRE`, `INICIO`, `OBJETIVO`, `ALCANCE`, `PUESTOS`, `RESPONSABILIDADES`,
`DEFINICIONES`, `ACTIVIDAD`, `FIN`) · `ID_ACTIVIDAD` (solo `ACTIVIDAD`) · `AUTOR_ID` · `AUTOR_NOMBRE` ·
`PERFIL` · `TEXTO` · `ESTADO` (`ABIERTA` → `ATENDIDA` por el colaborador → `CERRADA` por el revisor; `CAMBIO` es el
registro de una corrección que hizo Procesos, con cómo estaba y cómo quedó en `TEXTO`) ·
`RESPUESTA` (lo que contestó el colaborador) · `FECHA` · `FECHA_ATENCION`. Ver [revision.md](revision.md#observaciones).

### EnviosCH
Cada vez que Procesos sube el documento al sistema CH, y lo que CH resolvió. No hay conexión con CH:
Procesos registra aquí el resultado (decisión 15). `ID_ENVIO` · `ID_SOLICITUD` · `REVISION` ·
`FECHA_ENVIO` · `ENVIADO_POR` · `FOLIO_CH` (si CH da uno) · `RESULTADO` (`PENDIENTE`, `AUTORIZADO`,
`RECHAZADO`) · `AUTORIZO_NOMBRE` · `AUTORIZO_PUESTO` · `FECHA_AUTORIZACION` (el autorizador final,
como viene en CH) · `COMENTARIO` (motivo de un rechazo) · `REGISTRADO_POR` · `FECHA_REGISTRO`.
Con `AUTORIZADO` se genera el documento final sin marca de agua. `ID_ENVIO` es `ENV-000001`; `RESULTADO`
queda `PENDIENTE` desde que Procesos registra la subida hasta que registra lo que resolvió CH (a lo más
uno pendiente por solicitud). Con `RECHAZADO`, `COMENTARIO` es el motivo, que también llega al colaborador
como observación.

### Archivos
Todo Word/PDF generado. `ID_ARCHIVO` (`ARC-000001`) · `ID_SOLICITUD` · `REVISION` · `TIPO` (`PRELIMINAR` /
`FINAL`) · `FORMATO` (`DOCX` o `PDF`) · `ID_DRIVE` · `CON_MARCA_AGUA` · `HUELLA_CONTENIDO` (qué contenido
se imprimió: si ya no coincide con la huella actual, la pantalla lo marca «De una versión anterior») ·
`GENERADO_POR` (persona real) · `FECHA` · `NOMBRE` · `PESO_KB`.
Los preliminares nunca se reemplazan ni se les quita la leyenda (§4.4): cada generación agrega dos
renglones (PDF y Word). Viven en `Solicitudes/<folio>/Documentos`. Ver [plantillas.md](plantillas.md#generación-en-el-sistema-fase-4).

---

## Trazabilidad

### Instantaneas
Foto completa del contenido en cada envío a revisión y en el Vo.Bo., guardada como JSON en
`Solicitudes/<folio>/Instantáneas` (así la hoja no se llena de copias). `ID_INSTANTANEA`
(`INS-000001`) · `ID_SOLICITUD` · `REVISION` · `MOTIVO` (`ENVIO` o `VOBO`) · `HUELLA` ·
`ID_ARCHIVO_JSON` · `USUARIO` (persona real) · `FECHA`.

### HistorialCambios
Control de cambios oficial: solo se escribe cuando CH autoriza una versión (§4.2); un documento nuevo
empieza con su «Emisión inicial del documento» (versión 0.0). `ID_CAMBIO` (`CAM-000001`) ·
`ID_DOCUMENTO` · `VERSION` · `FECHA` · `MOTIVOS` · `DESCRIPCION` · `RESPONSABLE` (de la modificación) ·
`AUTORIZO_NOMBRE` · `AUTORIZO_PUESTO` · `ID_SOLICITUD`.

### Bitacora
Toda acción relevante (§4.3). `FECHA` · `USUARIO` (siempre la persona real; si usaba «Ver como», el
detalle empieza con `[viendo como …]`) · `ACCION` (`ALTA_USUARIO`, `CAMBIO_USUARIO`, `VER_COMO`,
`IMPORTAR_CATALOGO`, `CREAR_SOLICITUD`, `CANCELAR_SOLICITUD`, `EDITAR_CONFIRMADO`, `ANALIZAR_IA`,
`CONFIRMAR_SOLICITUD`, `GENERAR_PRELIMINAR`, `DESCARGAR_ARCHIVO`…; sus nombres en pantalla están en `NOMBRES_ACCION`) · `ID_SOLICITUD` ·
`ESTADO_ANTERIOR` · `ESTADO_NUEVO` · `DETALLE`. Se consulta en la pantalla «Bitácora» y no se edita.

### UsoIA
Cada llamada a la IA, para cuidar la cuota gratuita y auditar. `FECHA` · `USUARIO` · `ID_SOLICITUD` ·
`OPERACION` · `PROVEEDOR` · `MODELO` · `TOKENS_ENTRADA` · `TOKENS_SALIDA` · `DURACION_MS` ·
`RESULTADO`.
