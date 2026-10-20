# Captura de un proceso (fase 2)

Cómo documenta un colaborador su proceso, desde «Nueva solicitud» hasta el borrador guardado.
Requerimiento §2 y §3.1–3.2; diseño de la pantalla según el Anexo A (referencia aprobada).

## Los pasos

| Paso | Pantalla | Estado |
|---|---|---|
| 1 | Inicio de sesión (Google) | ✅ |
| 2 | **Información general** («Nueva solicitud») | ✅ fase 2 |
| 3 | **Desarrollo del proceso** (la captura) | ✅ fase 2 |
| 4 | Análisis con IA | ✅ fase 3 ([analisis-ia.md](analisis-ia.md)) |
| 5 | Vista previa y confirmación | ✅ fase 3 ([analisis-ia.md](analisis-ia.md)) |

## Paso 2: información general

El colaborador captura solo lo indispensable; lo demás sale de su perfil y de los catálogos (§2):

| Campo | De dónde sale |
|---|---|
| Tipo de solicitud | Elige: documento nuevo. **Actualizar un documento vigente llega en la fase 7** (necesita el inventario) |
| Tipo de documento | Elige entre los de `TiposDocumento` con `EN_SISTEMA = SI` (hoy solo Procedimiento); los demás se ven, pero deshabilitados |
| Nombre del documento | Lo escribe. Mientras escribe, el sistema busca **documentos vigentes y solicitudes en curso con nombre parecido** y los muestra; no impide continuar: Procesos decide si procede (§2.1) |
| Departamento | Sus departamentos (pantalla de usuarios), el principal primero. Sin departamento asignado no puede crear |
| Área / subárea | Las activas del departamento. El área es obligatoria (forma el código); la subárea, opcional |
| Elabora, puesto y fecha | Automáticos (se fijan al crear) |
| Código y versión | «Lo asigna Procesos» / «Se asigna al autorizarse». Se muestra cómo empezará: `P-CI04-___` |

Al crear: folio `SOL-2026-0001`, estado `BORRADOR`, una carpeta en Drive (`Solicitudes/SOL-2026-0001 · nombre`)
y un renglón en la bitácora (`CREAR_SOLICITUD`).

**Nombres parecidos** (`coincidenciasNombre_`): se comparan las palabras clave (sin acentos, sin
palabras como «de», «la», «procedimiento», y sin plural). Desde 50 % de parecido se muestran, hasta 5.

## Paso 3: desarrollo del proceso

Como en la referencia aprobada: «¿Qué sucede para que inicie?», las actividades en orden y «¿Cómo
finaliza?». Cada actividad tiene:

- **Texto** libre («menciona qué se hace y quién lo realiza»).
- **Responsable** opcional, por si no lo dijo en el texto (Procesos pidió poder indicarlo; la IA de la
  fase 3 lo detectará del texto y preguntará si falta).
- **Imágenes**: botón, **Ctrl + V** o arrastrar y soltar. Cada una con su **pie**. Se pueden ver en
  grande, mover y quitar.
- Botones para subir, bajar y eliminar la actividad.

### Se guarda solo

- Cada cambio programa un guardado (1.2 s después de dejar de escribir). Arriba dice «Guardado»,
  «Guardando…» o «Cambios sin guardar». Al salir de la pantalla se guarda lo pendiente.
- Guardados y subidas de imágenes van **en una sola fila**: nunca se cruzan. Si se pega una imagen en
  una actividad nueva, primero se guarda la actividad y después se sube la imagen.
- **Otra pestaña:** cada guardado lleva la «marca» de la última versión. Si la solicitud cambió en otra
  ventana, el servidor no guarda y la pantalla pide recargar (no se pisa nada).
- Si falla la red, reintenta a los 5 segundos.
- Nada se borra: una actividad o imagen quitada queda con `ELIMINADA = SI`.
- **Editar una solicitud CONFIRMADA la regresa a BORRADOR** (§3.5): la confirmación queda ligada a la
  huella del contenido que se confirmó (`HUELLA_CONTENIDO`, SHA-256 de textos, responsables, imágenes y
  pies en su orden).

### Imágenes (§3.2)

El navegador las optimiza **antes** de subirlas, con los parámetros de la hoja `Config`:

| Archivo | Para qué | Cómo |
|---|---|---|
| WebP (`ID_ARCHIVO`) | Verla en la app | Ancho máx. `IMG_ANCHO_MAX` (1600), calidad `IMG_CALIDAD` (0.82); si pasa de `IMG_PESO_OBJETIVO_KB` (300) baja la calidad, nunca de 0.6, para que se lea el texto |
| JPG (`ID_ARCHIVO_DOCUMENTO`) | Ponerla en el Word/PDF | Mismo tamaño, calidad 0.85, fondo blanco (Google Docs no acepta WebP) |
| Miniatura WebP (`ID_ARCHIVO_MINIATURA`) | Mostrarla rápido en la captura | 360 px de ancho |

Si el navegador no sabe crear WebP, usa JPG. Se aceptan PNG, JPG y WebP; hasta `IMG_MAX_POR_ACTIVIDAD`
(10) por actividad. Prueba del 20/10/2026: una captura de 2400 × 1350 (PNG, 283 KB) quedó en 1600 × 900
y 64 KB. Los archivos viven en `Solicitudes/<folio>/Imágenes`; nadie tiene acceso directo: la app los
entrega.

### Topes

`LIMITES_CAPTURA` (`src/config/Config.gs`): 150 actividades, 4 000 caracteres por actividad, 2 000 en
inicio y fin, 200 en un pie, 4 MB por imagen ya optimizada.

## Quién ve y quién edita

| | Ver | Editar |
|---|---|---|
| Quien la elaboró | Sí | Sí, en BORRADOR, CONFIRMADO o DEVUELTO |
| Revisor de Procesos | Sí | No (la revisión es la fase 5) |
| Soporte CI | Sí | No |
| Administrador | No | No |

En otro estado, quien la elaboró la ve en modo consulta con el motivo («Está en revisión de Procesos…»).
Puede **cancelar** su solicitud mientras sea editable (`CANCELAR_SOLICITUD` en la bitácora).

## Dónde está el código

- `src/services/Solicitudes.gs`: opciones, validación, coincidencias, permisos, detalle, guardado del
  borrador, imágenes y cancelación. Lo puro está probado en `tests/solicitudes.test.js`.
- `src/utils/Huella.gs`: huella del contenido.
- `src/html/js/solicitudes.html` (nueva y «Mis solicitudes»), `js/editor.html` (captura),
  `js/imagenes.html` (optimización); vistas en `src/html/views/`.
