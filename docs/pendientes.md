# Pendientes

Lista viva de lo que falta hacer o revisar **fuera del código**: lo que Gael corre en Apps Script, lo
que Procesos debe entregar o decidir, y lo que hay que validar en pruebas. Se actualiza en cada commit
que agregue algo aquí; lo hecho se tacha con la fecha.

## 1. Cuando Gael tenga acceso a Apps Script

En este orden:

1. **Activar la API de Apps Script** en https://script.google.com/home/usersettings (la subida con
   clasp falló el 19/10/2026 porque estaba desactivada). Avisar para subir a pruebas.
2. **Subir a pruebas:** `npm run pruebas -- "Fase 1 completa y captura"` (sube y publica en el mismo
   link de la web app).
3. En el editor de **BD Procesos - PRUEBAS**, F5 y correr:
   1. `instalarPruebas()` — crea la hoja `Subareas`, agrega `OBSERVACIONES` a `Areas`, reacomoda las
      hojas vacías (`Solicitudes`, `Documentos`, `Imagenes`…). Revisar el registro.
   2. `verificarBase()` → debe decir `"correcto": true`.
   3. `crearUsuariosDePrueba()` — agrega a Diego Herrera (Soporte CI).
   4. `importarCatalogoInicial()` — en **producción**, solo con el catálogo corregido (ver sección 2).
      En **pruebas** se puede cargar el actual para no detener las pruebas de la captura (sin
      departamentos nadie puede crear solicitudes); cuando llegue el corregido, se vacían a mano las
      hojas `Departamentos`, `Areas` y `Subareas` de pruebas y se vuelve a importar.
4. **Revisar en la app de pruebas** (con «Ver como»):
   - [ ] Usuarios y perfiles: alta, edición, baja; que no deje cambiar tus propios perfiles.
   - [ ] Soporte CI (Diego): todo en consulta, sin botones para cambiar.
   - [ ] Bitácora: aparecen los «Ver como», altas y cambios.
   - [ ] Catálogos: departamentos, áreas, subáreas y buscador.
   - [ ] Asignar departamento a Ana y Luis (colaboradores de prueba) para que puedan crear solicitudes.
   - [ ] **Captura (fase 2)** con Ana (colaboradora, ya con departamento): crear una solicitud, ver el
     aviso de nombre parecido, escribir actividades, reordenarlas, pegar capturas con Ctrl + V,
     ponerles pie, salir y volver (que todo siga), cancelar una solicitud.
   - [ ] Que en Drive aparezca `Solicitudes/SOL-…/Imágenes` con los tres archivos por imagen.
   - [ ] Abrir la solicitud como Paola (revisora) y Diego (Soporte CI): deben verla en modo consulta.
   - [ ] Abrir la misma solicitud en dos pestañas y escribir en las dos: la segunda debe pedir recargar.
   - [ ] **IA (fase 3):** poner `Config → IA_ACTIVA = SI` en la base de pruebas. Con Ana: «Ir al
     análisis» → «Analizar con IA»; revisar que las propuestas tengan sentido y no inventen, responder
     las preguntas (también «No aplica» / «No lo sé»), aceptar, editar y descartar propuestas.
   - [ ] En la hoja `UsoIA` debe aparecer cada llamada; en `PropuestasIA` y `Aclaraciones`, lo decidido.
   - [ ] Escribir un correo o un monto en una actividad: la propuesta de la IA debe traerlo tal cual
     (a Gemini solo le llega una marca como `[CORREO 1]`).
   - [ ] Vista previa: que se vea como el documento y que **confirme**; luego editar algo y ver que
     regresa a borrador.
   - [ ] Con `IA_ACTIVA = NO`: el botón de analizar se deshabilita y todo se puede escribir a mano.
   - [ ] **Documento preliminar (fase 4):** volver a correr `prepararPlantillas()` para que registre las
     plantillas en `TiposDocumento` (el registro debe decir «Registradas en el tipo Procedimiento»).
   - [ ] Con una solicitud confirmada: «Generar Word y PDF» y **revisar los dos archivos**: marca de
     agua, portada, encabezado y pie en todas las hojas, «Página x de y», versión 0.0, código «Por
     asignar», actividades con imágenes y pies, firmas de quien elaboró. Mandar capturas a Procesos.
   - [ ] Que en Drive quede `Solicitudes/<folio>/Documentos` con el PDF y el Word (el Google Doc
     intermedio en la papelera).
   - [ ] **Revisión (fase 5):** volver a correr `instalarPruebas()` (agrega `FECHA_ENVIO_REVISION` al
     final de `Solicitudes`) y `verificarBase()`.
   - [ ] Con Ana: en la vista previa de una solicitud confirmada, «Enviar a revisión de Procesos». En
     Drive debe aparecer `Solicitudes/<folio>/Instantáneas` con un JSON.
   - [ ] Con Paola: «Bandeja de revisión» → «Sin asignar» → **Tomar**; hacer observaciones con
     «Observar» (una general y una de actividad) y **Devolver**.
   - [ ] Con Ana: ver el aviso «Procesos te regresó…», corregir, marcar las observaciones como
     atendidas, **confirmar otra vez** y **reenviar**. Debe volver a la pestaña «Mías» de Paola.
   - [ ] Con Paola: cerrar las observaciones y dar el **Vo.Bo.** con el código propuesto (o corregirlo).
     Revisar en `Solicitudes`: código, versión 0.0, `REVISO_*`; y en `Consecutivos`, la serie `COD-…`.
   - [ ] Probar **No procedente** (pide motivo) y que Ana vea el motivo.
   - [ ] Con el administrador: la bandeja solo con el selector para **reasignar**.
   - [ ] Que Paola no pueda tomar una solicitud que ella elaboró (si tiene también perfil de colaboradora).
5. Mandar capturas de lo que se vea raro.

## 2. Por recibir de Procesos

- [ ] **Catálogo de departamentos y áreas corregido** (el del 19/10/2026 tenía errores). Al llegar:
  reemplazar `docs/insumos/catalogo-departamentos-areas.xlsx`, `npm run catalogo`, `npm test` y revisar
  los avisos. Los pendientes del archivo anterior están en [catalogos.md](catalogos.md#pendientes-para-procesos).
- [ ] **Catálogo de puestos** por departamento (la IA lo usa para reconocer responsables). También el
  **puesto de cada revisor**: con el Vo.Bo. se guarda en `REVISO_PUESTO` y sale en «Revisó» del documento.
- [ ] **Lista de usuarios** con su perfil y departamento.
- [ ] Respuestas D–K del [análisis](analisis-inicial.md#9-preguntas-abiertas), sobre todo **E** (cómo se
  asigna el revisor), **F** (consecutivo del código) y **J** (inventario documental y un documento
  aprobado de ejemplo).
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
