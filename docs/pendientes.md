# Pendientes

Lista viva de lo que falta hacer o revisar **fuera del código**: lo que Gael corre en Apps Script, lo
que Procesos debe entregar o decidir, y lo que hay que validar en pruebas. Se actualiza en cada commit
que agregue algo aquí; lo hecho se tacha con la fecha.

## 1. Cuando Gael tenga acceso a Apps Script

Todo lo de las fases 1 a 6 está en el código pero **nada se ha probado en Apps Script real**. Primero se
prepara el ambiente de pruebas (una sola vez) y luego se recorre **una solicitud de principio a fin**,
en el mismo orden en que la usará la gente.

### 1.1 Preparación (una sola vez)

1. **Activar la API de Apps Script** en https://script.google.com/home/usersettings (la subida con
   clasp falló el 19/10/2026 porque estaba desactivada).
2. **Subir a pruebas:** avisar a Claude, o correr `npm run pruebas -- "Fases 1 a 6"` (sube y publica en
   el mismo link de la web app).
3. En el editor de **BD Procesos - PRUEBAS**, F5 y correr en este orden (revisar el registro de cada una):
   1. `instalarPruebas()` — pone la base al día: hoja `Subareas`, `OBSERVACIONES` en `Areas`,
      `FECHA_ENVIO_REVISION` al final de `Solicitudes`, hojas vacías reacomodadas, retiro de las que ya
      no se usan.
   2. `verificarBase()` → debe decir `"correcto": true`.
   3. `crearUsuariosDePrueba()` — agrega a Diego Herrera (Soporte CI) y los perfiles que falten.
   4. `importarCatalogoInicial()` — carga la lista maestra corregida del 21/10/2026 (27 departamentos,
      147 áreas, 28 subáreas). El registro debe decir cuántos creó y ningún aviso.
   5. `prepararPlantillas()` — registra las dos plantillas (con y sin marca) en `TiposDocumento`: el
      registro debe decir «Registradas en el tipo Procedimiento» y la fila del Procedimiento debe tener
      `ID_PLANTILLA_PRELIMINAR` e `ID_PLANTILLA_FINAL`.
4. En la hoja `Config` de pruebas: `IA_ACTIVA = SI`.
5. En la app de pruebas, pantalla **Usuarios**: asignar departamento a Ana y a Luis (colaboradores de
   prueba) y, si ya hay puestos, un puesto a Paola y a Carlos (sale en «Revisó» del documento).

### 1.2 Recorrido de prueba (con «Ver como»)

**Administración (fase 1)**
- [ ] Usuarios y perfiles: alta, edición, baja; que no deje cambiar tus propios perfiles.
- [ ] Soporte CI (Diego): todo en consulta, sin botones para cambiar.
- [ ] Bitácora: aparecen los «Ver como», altas y cambios.
- [ ] Catálogos: departamentos, áreas, subáreas y buscador.

**Captura (fase 2)** — con Ana
- [ ] Crear una solicitud, ver el aviso de nombre parecido, escribir actividades, reordenarlas, pegar
  capturas con Ctrl + V, ponerles pie, salir y volver (que todo siga), cancelar otra solicitud.
- [ ] En Drive, `Solicitudes/SOL-…/Imágenes` con los tres archivos por imagen.
- [ ] Abrir la solicitud como Paola (revisora) y Diego (Soporte CI): deben verla en modo consulta.
- [ ] Abrir la misma solicitud en dos pestañas y escribir en las dos: la segunda debe pedir recargar.

**Análisis con IA y confirmación (fase 3)** — con Ana
- [ ] «Ir al análisis» → «Analizar con IA»: que las propuestas tengan sentido y no inventen; responder
  las preguntas (también «No aplica» / «No lo sé»); aceptar, editar y descartar propuestas.
- [ ] En `UsoIA` aparece cada llamada; en `PropuestasIA` y `Aclaraciones`, lo decidido.
- [ ] Escribir un correo o un monto en una actividad: la propuesta debe traerlo tal cual (a Gemini solo
  le llega una marca como `[CORREO 1]`).
- [ ] Vista previa: que se vea como el documento y que **confirme**; luego editar algo y ver que regresa
  a borrador. Volver a confirmar.
- [ ] Con `IA_ACTIVA = NO`: el botón de analizar se deshabilita y todo se puede escribir a mano.

**Documento preliminar (fase 4)** — con Ana, ya confirmada
- [ ] «Generar Word y PDF» y **revisar los dos archivos**: marca de agua, portada, encabezado y pie en
  todas las hojas, «Página x de y», versión 0.0, código «Por asignar», actividades con imágenes y pies,
  firma de quien elaboró. Mandar capturas a Procesos.
- [ ] En Drive, `Solicitudes/<folio>/Documentos` con el PDF y el Word (el Google Doc intermedio, en la papelera).

**Revisión de Procesos (fase 5)**
- [ ] Ana: «Enviar a revisión de Procesos». En Drive, `Solicitudes/<folio>/Instantáneas` con un JSON.
- [ ] Paola: «Bandeja de revisión» → «Sin asignar» → **Tomar**; observaciones con «Observar» (una general
  y una de actividad) y **Devolver**.
- [ ] Ana: aviso «Procesos te regresó…», corregir, marcar las observaciones como atendidas, **confirmar
  otra vez** y **reenviar**. Debe volver a la pestaña «Mías» de Paola.
- [ ] Paola: cerrar las observaciones y dar el **Vo.Bo.** con el código propuesto (o corregirlo). En
  `Solicitudes`: código, versión 0.0, `REVISO_*`; en `Consecutivos`, la serie `COD-…`.
- [ ] **No procedente** con otra solicitud (pide motivo) y que Ana vea el motivo.
- [ ] Sofía (administradora): la bandeja solo con el selector para **reasignar**.
- [ ] Carlos (revisor y colaborador): no puede tomar una solicitud que él elaboró.

**CH, documento final e inventario (fase 6)** — con Paola
- [ ] «Envíos a CH» → «Por subir»: **Generar archivos para CH**, descargarlos y revisar que traigan
  código, versión 0.0 y «Revisó». **Registrar que ya se subió** (fecha y folio).
- [ ] «En CH» → **Lo autorizó** (nombre, puesto, fecha). Se genera el **final sin marca**: revisar el PDF
  y el Word (sin «COPIA NO AUTORIZADA», con «Autorizó» y la fecha de CH).
- [ ] **Inventario documental**: el documento vigente, versión 0.0, su historial y la descarga. Con Sofía
  y Diego también debe verse y descargarse.
- [ ] Ana: su vista previa dice «Autorizado en el sistema CH» y ofrece el documento final.
- [ ] **Lo rechazó** con otra solicitud: Ana la ve devuelta con la observación «Rechazado en el sistema
  CH: …»; al corregir y reenviar, el nuevo Vo.Bo. conserva el código.

Mandar capturas de lo que se vea raro.

## 2. Por recibir de Procesos

- [x] ~~Catálogo de departamentos y áreas corregido~~ → llegó la lista maestra el 21/10/2026 y ya está en
  el código. Quedan por confirmar con Procesos tres cosas ([catalogos.md](catalogos.md#pendientes-para-procesos)):
  si los documentos vigentes conservan su código anterior (52 áreas cambiaron de clave), los 10
  departamentos que ya no vienen y unas posibles erratas.
- [ ] **Catálogo de puestos** por departamento (la IA lo usa para reconocer responsables). También el
  **puesto de cada revisor**: con el Vo.Bo. se guarda en `REVISO_PUESTO` y sale en «Revisó» del documento.
- [ ] **Lista de usuarios** con su perfil y departamento.
- [ ] Respuestas D–K del [análisis](analisis-inicial.md#9-preguntas-abiertas), sobre todo **D** (qué pasa si
  CH rechaza; hoy regresa al colaborador como observación), **E** (cómo se asigna el revisor), **F**
  (consecutivo del código), **I** (documentos que no pasan por CH) y **J** (inventario documental actual,
  para cargarlo, y un documento aprobado de ejemplo).
- [ ] Plantillas de Manual, Protocolo y Política (cuando quieran incorporarlos).

## 3. Decisiones por confirmar con Gael

- [ ] Regla «nadie cambia sus propios perfiles ni se da de baja» (agregada el 20/10/2026 junto con la
  decisión 19). Si no se quiere, se quita en `planGuardarUsuario_`.

## 4. Antes de pasar a producción

- [ ] Gael valida en pruebas.
- [ ] `npm run produccion -- "…"` desde un commit limpio.
- [ ] En el editor de **BD Procesos**: `instalarProduccion()`, `verificarBase()`, `importarCatalogoInicial()`.
- [ ] Crear la implementación de la web app de producción y poner su ID en `tools/subir.js`.
- [ ] Dar de alta a los usuarios reales (Procesos, colaboradores) en la pantalla de usuarios.
- [ ] Capturar `IA_LLAVE` de producción (ya está, revisar que siga) y poner `Config → IA_ACTIVA = SI`
  cuando la fase 3 esté lista.
