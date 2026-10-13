# Base de datos

Cada ambiente usa una hoja de Google Sheets (`BD Procesos` / `BD Procesos - PRUEBAS`). La estructura
la define **`src/config/Esquema.gs`** y la crea `instalarPruebas()` / `instalarProduccion()`; este
documento explica para qué sirve cada hoja y cada columna. **Si cambias el esquema, cambia este
documento en el mismo commit.**

## Reglas generales

- **El nombre de cada hoja y de cada columna es contrato con el código.** El código busca columnas
  por su encabezado (no por posición), pero renombrar una lo rompe.
- **Columnas nuevas, siempre al final.** La instalación las agrega sin tocar los datos.
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
Usuarios ─┬─< UsuarioPerfiles            Departamentos ─< Puestos
          └─< UsuarioDepartamentos >──── Departamentos
TiposDocumento ─< CadenasAutorizacion
Documentos (inventario) ─< Solicitudes ─┬─< Actividades ─< Imagenes
                       └─< HistorialCambios ├─< Aclaraciones · PropuestasIA · Observaciones
                                            ├─< Autorizaciones · Archivos · Instantaneas
                                            └─< Bitacora · UsoIA
```

---

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
| `PREFIJO_SOLICITUD` | SOL | Prefijo del folio interno |
| `CORREO_PROCESOS` | (vacío) | Buzón del área para avisos |

La llave de la IA **no** va aquí: va en las Propiedades del script ([ambientes.md](ambientes.md)).

### Consecutivos
`SERIE` · `ULTIMO` · `FECHA_ACTUALIZACION`. Último número usado por cada serie (`USR`, `SOL-2026`…).
No se edita a mano.

---

## Catálogos

### Usuarios
`ID_USUARIO` · `CORREO` (cuenta de Google con la que entra) · `NOMBRE` · `ID_PUESTO` · `ACTIVO` ·
`FECHA_ALTA` · `ACTUALIZADO_POR` · `FECHA_ACTUALIZACION`

### UsuarioPerfiles
Una persona puede tener varios perfiles (§1). `ID_USUARIO_PERFIL` · `ID_USUARIO` · `PERFIL`
(`COLABORADOR`, `REVISOR`, `AUTORIZADOR`, `ADMINISTRADOR`) · `ID_DEPARTAMENTO` (alcance; vacío =
todos) · `NIVEL_AUTORIZACION` (solo autorizadores: 1 = responsable del área, 2 = Dirección) ·
`ACTIVO` · `FECHA_ALTA`.
Ser `ADMINISTRADOR` no da permiso de revisar ni autorizar.

### UsuarioDepartamentos
Departamentos por los que una persona puede elaborar documentos; si tiene varios, elige al crear la
solicitud (§2). `ID_USUARIO_DEPARTAMENTO` · `ID_USUARIO` · `ID_DEPARTAMENTO` · `PRINCIPAL` (el que se
propone por defecto) · `ACTIVO`.

### Departamentos
`ID_DEPARTAMENTO` · `NOMBRE` · `CLAVE_CODIGO` (la parte del código documental que identifica al área,
p. ej. `CM01`; por confirmar con Procesos) · `DIRECCION` · `ACTIVO`.

### Puestos
`ID_PUESTO` · `NOMBRE` · `ID_DEPARTAMENTO` · `SINONIMOS` (otras formas de llamarlo, separadas por
coma: ayudan a la IA a reconocer al responsable) · `ACTIVO`.

### TiposDocumento
`ID_TIPO` · `NOMBRE` · `PREFIJO_CODIGO` · `ID_PLANTILLA_PRELIMINAR` · `ID_PLANTILLA_FINAL` · `ACTIVO`.
Viene sembrada con Manual, Procedimiento (`PRO`), Protocolo y Política; los demás prefijos y las
plantillas se llenan cuando Procesos los defina. Cada tipo tiene **dos** plantillas: la preliminar
con «COPIA NO AUTORIZADA» y la final sin marca.

### CadenasAutorizacion
Quién autoriza, y en qué orden, después del Vo.Bo. de Procesos. `ID_CADENA` · `ID_TIPO` ·
`ID_DEPARTAMENTO` (vacío en los dos = aplica a todos) · `NIVEL` · `NOMBRE_NIVEL` · `ID_USUARIO`
(vacío = se toma el autorizador de ese nivel en el departamento del documento) · `ACTIVO`.
Viene sembrada con la cadena general: 1 Responsable del área → 2 Dirección. Para un tipo o
departamento con otra cadena se agregan renglones específicos, que ganan sobre la general.

---

## Operación

### Documentos — inventario documental
Un renglón por documento oficial. `ID_DOCUMENTO` · `CODIGO` · `NOMBRE` · `ID_TIPO` ·
`ID_DEPARTAMENTO` · `VERSION_VIGENTE` · `FECHA_VIGENCIA` · `ESTATUS` (`VIGENTE` / `OBSOLETO`) ·
`ID_SOLICITUD_VIGENTE` (la que lo autorizó) · `ID_ARCHIVO_WORD` · `ID_ARCHIVO_PDF` ·
`CONTENIDO_ESTRUCTURADO` (`SI` si nació en el sistema y se puede actualizar actividad por actividad) ·
`ORIGEN` (`SISTEMA` o `HISTORICO`, para los que se carguen del inventario actual de Procesos) ·
`FECHA_REGISTRO`.
Mientras una actualización está en curso, este renglón **no cambia**; solo se actualiza al autorizar.

### Solicitudes
Cada trámite, de borrador a autorizado.

| Columnas | Qué guardan |
|---|---|
| `ID_SOLICITUD` | Folio interno `SOL-2026-0001`; existe aunque nunca se asigne código oficial |
| `TIPO_SOLICITUD` · `ID_TIPO` · `ID_DOCUMENTO` | Nuevo o actualización; tipo de documento; documento que se actualiza |
| `NOMBRE_DOCUMENTO` · `ID_DEPARTAMENTO` | Datos generales |
| `ESTADO` · `NIVEL_AUTORIZACION_ACTUAL` | Dónde va (ver [flujos](analisis-inicial.md#32-estados-de-una-solicitud-propuesta)) |
| `INICIO_PROCESO` · `FIN_PROCESO` | Respuestas a «¿Qué sucede para que inicie?» y «¿Cómo finaliza?» |
| `OBJETIVO` · `ALCANCE` · `RESPONSABILIDADES` · `DEFINICIONES` | Textos derivados (los dos últimos en JSON) |
| `MOTIVOS_CAMBIO` | Solo actualizaciones (§4.2) |
| `CODIGO` · `VERSION` | Vacíos hasta que Procesos asigne código / hasta autorizar |
| `REVISION` | Vueltas de revisión (1, 2, 3…); no es la versión oficial |
| `HUELLA_CONTENIDO` · `HUELLA_CONFIRMADA` · `FECHA_CONFIRMACION` | Huella del contenido actual y del que confirmó el colaborador; si no coinciden, hay que volver a confirmar (§3.5) |
| `ELABORO_*` · `REVISO_*` · `AUTORIZO_*` y sus fechas | Nombre y puesto fijados al momento de cada acción (§4.1) |
| `MOTIVO_CIERRE` | Por qué se cerró como no procedente |
| `ID_CARPETA` · `FECHA_ACTUALIZACION` | Carpeta de la solicitud en Drive; último cambio |

### Actividades
`ID_ACTIVIDAD` · `ID_SOLICITUD` · `ORDEN` (lo define el colaborador; la IA no lo cambia) ·
`TEXTO_ORIGINAL` (lo que escribió) · `TEXTO_FINAL` (lo que va al documento) · `ID_PUESTO` ·
`PUESTO_TEXTO` (como lo escribió, si no está en el catálogo) · `RESPONSABLE_CONFIRMADO` · `ELIMINADA` ·
`FECHA_ACTUALIZACION`.

### Imagenes
`ID_IMAGEN` · `ID_ACTIVIDAD` · `ID_SOLICITUD` · `ORDEN` (dentro de la actividad) · `ID_ARCHIVO` (WebP
para la app) · `ID_ARCHIVO_DOCUMENTO` (JPEG/PNG para Word/PDF) · `FORMATO` · `ANCHO` · `ALTO` ·
`PESO_KB` · `PIE` · `ELIMINADA` · `FECHA_CARGA`.
Se ligan a la actividad por ID: reordenar actividades nunca rompe la relación (§3.2).

### Aclaraciones
Preguntas complementarias. `ID_ACLARACION` · `ID_SOLICITUD` · `ID_ACTIVIDAD` (vacío = general) ·
`TIPO` (responsable, autorización, excepción, plazo, documento…) · `PREGUNTA` · `RESPUESTA` · `ESTADO`
(`PENDIENTE`, `RESPONDIDA`, `NO_APLICA`, `NO_LO_SE`) · `ORIGEN` (`IA` o `PROCESOS`) ·
`FECHA_PREGUNTA` · `FECHA_RESPUESTA`.

### PropuestasIA
Lo que propuso la IA y qué decidió la persona: la IA propone, la persona decide. `ID_PROPUESTA` ·
`ID_SOLICITUD` · `ID_ACTIVIDAD` · `CAMPO` (`TEXTO`, `OBJETIVO`, `ALCANCE`, `RESPONSABLE`, `ORDEN`,
`PIE`…) · `VALOR_ANTERIOR` · `PROPUESTA` · `JUSTIFICACION` · `EVIDENCIA` (fragmento del texto del
colaborador que la sustenta) · `DECISION` (`PENDIENTE`, `ACEPTADA`, `EDITADA`, `RECHAZADA`) ·
`VALOR_FINAL` · `FECHA_PROPUESTA` · `FECHA_DECISION`.

### Observaciones
De Procesos o de los autorizadores. `ID_OBSERVACION` · `ID_SOLICITUD` · `REVISION` · `APARTADO`
(objetivo, alcance, actividad…) · `ID_ACTIVIDAD` · `AUTOR_ID` · `AUTOR_NOMBRE` · `PERFIL` · `TEXTO` ·
`ESTADO` (`ABIERTA`, `ATENDIDA`, `CERRADA`) · `RESPUESTA` · `FECHA` · `FECHA_ATENCION`.

### Autorizaciones
Un renglón por nivel de la cadena y por vuelta. `ID_AUTORIZACION` · `ID_SOLICITUD` · `REVISION` ·
`NIVEL` · `NOMBRE_NIVEL` · `ID_USUARIO` · `NOMBRE` · `PUESTO` (fijados al decidir) · `DECISION`
(`PENDIENTE`, `AUTORIZADO`, `DEVUELTO`) · `COMENTARIO` · `FECHA_ASIGNACION` · `FECHA_DECISION`.
Una decisión solo se acepta si corresponde al nivel actual real de la solicitud (evita dobles clics
y saltos de nivel).

### Archivos
Todo Word/PDF generado. `ID_ARCHIVO` · `ID_SOLICITUD` · `REVISION` · `TIPO` (`PRELIMINAR` / `FINAL`) ·
`FORMATO` (`DOCX`, `PDF`, `GDOC`) · `ID_DRIVE` · `CON_MARCA_AGUA` · `HUELLA_CONTENIDO` (qué contenido
se imprimió) · `GENERADO_POR` · `FECHA`.
Los preliminares nunca se reemplazan ni se les quita la leyenda (§4.4).

---

## Trazabilidad

### Instantaneas
Foto completa del contenido en cada confirmación y cada envío, guardada como JSON en Drive (así la
hoja no se llena de copias). `ID_INSTANTANEA` · `ID_SOLICITUD` · `REVISION` · `MOTIVO` · `HUELLA` ·
`ID_ARCHIVO_JSON` · `USUARIO` · `FECHA`.

### HistorialCambios
Control de cambios oficial: solo se escribe al autorizar una versión (§4.2). `ID_CAMBIO` ·
`ID_DOCUMENTO` · `VERSION` · `FECHA` · `MOTIVOS` · `DESCRIPCION` · `AUTORIZO_NOMBRE` ·
`AUTORIZO_PUESTO` · `ID_SOLICITUD`.

### Bitacora
Toda acción relevante (§4.3). `FECHA` · `USUARIO` · `ACCION` · `ID_SOLICITUD` · `ESTADO_ANTERIOR` ·
`ESTADO_NUEVO` · `DETALLE`.

### UsoIA
Cada llamada a la IA, para cuidar la cuota gratuita y auditar. `FECHA` · `USUARIO` · `ID_SOLICITUD` ·
`OPERACION` · `PROVEEDOR` · `MODELO` · `TOKENS_ENTRADA` · `TOKENS_SALIDA` · `DURACION_MS` ·
`RESULTADO`.
