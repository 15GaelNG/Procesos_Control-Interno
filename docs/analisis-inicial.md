# Análisis inicial — Sistema de Documentación de Procesos

> **Estado:** validado con Gael el 13/10/2026 (ver [Decisiones](#decisiones-tomadas)); pendientes
> las reglas que debe definir Procesos.
> **Insumos analizados** (en `insumos/`):
> - `requerimientos-sistema.docx` → transcrito en [requerimientos.md](insumos/requerimientos.md)
> - `flujo-del-sistema.jpeg` → infografía del recorrido (12 pasos y 6 roles)
> - `plantilla-ciudad-maderas.docx` → plantilla institucional (vistas: `plantilla-vista-portada.png`,
>   `plantilla-vista-contenido.png`)
>
> Lo que sigue abierto está en [preguntas abiertas](#9-preguntas-abiertas).

## Decisiones tomadas

| # | Decisión | Fecha |
|---|---|---|
| 1 | **El documento de requerimientos manda** sobre la infografía y sobre lo que se platicó de palabra. | 13/10/2026 |
| 2 | **Marca de agua:** todo lo generado antes del **Vo.Bo. final** (jefe directo / director, §4.4) sale con «COPIA NO AUTORIZADA». La validación de Procesos no la quita. | 13/10/2026 |
| 3 | **Dos plantillas por tipo de documento:** preliminar (con marca) y final (sin marca). El final es un archivo nuevo; los preliminares no se tocan. | 13/10/2026 |
| 4 | **Drive:** todo vive en la carpeta del proyecto, con un ambiente de **pruebas** y uno de **producción** ([ambientes.md](ambientes.md)). | 13/10/2026 |
| 5 | **Propietario:** hoy `especialista2datos.ci`; en el futuro `procesos.ci`. Todo se diseñó para cambiarlo sin tocar código. | 13/10/2026 |
| 6 | **IA:** API de Gemini en su nivel gratuito, detrás de una capa intercambiable ([ia.md](ia.md)). | 13/10/2026 |
| 7 | **Repositorio en GitHub** y subida con clasp, como SIVET y Control Interno. | 13/10/2026 |
| 8 | **Base de datos:** 22 hojas definidas en `src/config/Esquema.gs` ([base-de-datos.md](base-de-datos.md)). | 13/10/2026 |

---

## 1. Resumen

Los colaboradores de Ciudad Maderas necesitan documentar cómo hacen su trabajo (manuales,
procedimientos, protocolos y políticas) y el área de **Procesos** necesita revisarlos, darles código,
versión y llevarlos hasta su autorización. Hoy eso se hace a mano en Word, con formatos y redacción
dispares, sin trazabilidad y sin control claro de qué versión es la vigente.

**La solución:** una web app en Google Apps Script donde el colaborador **describe su proceso
actividad por actividad** (con capturas de pantalla), una **IA le ayuda a redactarlo bien y le
pregunta lo que falta sin inventar nada**, el colaborador confirma el borrador, y el documento viaja
por **revisión de Procesos → autorizaciones → publicación**. El sistema genera el Word/PDF sobre la
plantilla institucional, con marca de agua «COPIA NO AUTORIZADA» hasta la autorización final, y
registra automáticamente quién elaboró, revisó y autorizó.

---

## 2. La problemática (lo que el sistema tiene que resolver)

| Problema de hoy | Cómo lo resuelve el sistema |
|---|---|
| El colaborador no sabe redactar un procedimiento ni qué secciones lleva | Captura guiada por actividades y preguntas orientadoras; la IA propone objetivo, alcance, responsabilidades y redacción |
| Los documentos llegan incompletos (sin responsable, sin excepciones, sin cierre) | La IA detecta lo que falta y pregunta; se puede responder «No aplica» / «No lo sé» |
| Cada documento tiene un formato distinto | Se genera siempre desde la plantilla institucional |
| Se duplican documentos que ya existen | Al crear uno nuevo se sugieren coincidencias del inventario documental |
| No se sabe quién revisó/autorizó ni cuándo | Elaboró / Revisó / Autorizó y fechas se registran solos, con foto del puesto en ese momento |
| Circulan borradores como si fueran oficiales | Todo lo previo a la autorización sale con «COPIA NO AUTORIZADA»; la versión limpia solo se descarga si el servidor lo permite |
| Se pierde el historial de versiones | Inventario documental con versión vigente, historial y control de cambios en actualizaciones |

---

## 3. El flujo como lo entendí

### 3.1 Recorrido (infografía + requerimientos)

```
 COLABORADOR                                            PROCESOS            AUTORIZACIONES
 ───────────                                            ────────            ──────────────
 1 Inicio de sesión (perfil, nombre, puesto, depto. automáticos)
 2 Información general (tipo de solicitud, tipo de doc., nombre / doc. a actualizar)
 3 Desarrollo del proceso (inicio, actividades + imágenes, fin)
 4 Análisis con IA (redacción, responsables, objetivo, alcance, faltantes → preguntas)
 5 Vista previa y confirmación ◄─────────────┐
 6 Envío a revisión ──────────────────────►  7 ¿Requiere correcciones?
                                             │   Sí → observaciones ──┘ (vuelve al paso 5)
                                             │   No ↓
                                             8 Vo.Bo. de Procesos ──► 9 Envío a «sistema CH»
                                                                      10 Autorización del responsable
                                                                      11 Autorización de Dirección
                                                                      12 Publicación (versión vigente)
```

### 3.2 Estados de una solicitud (propuesta)

| Estado | Quién la tiene | Sale hacia |
|---|---|---|
| `BORRADOR` | Colaborador | `CONFIRMADO` |
| `CONFIRMADO` | Colaborador (ya puede generar preliminar) | `EN_REVISION` · vuelve a `BORRADOR` si edita algo |
| `EN_REVISION` | Procesos | `DEVUELTO` · `EN_AUTORIZACION` · `NO_PROCEDENTE` |
| `DEVUELTO` | Colaborador (atiende observaciones) | `CONFIRMADO` → `EN_REVISION` |
| `EN_AUTORIZACION` | Autorizador del nivel actual (responsable → Dirección) | siguiente nivel · `DEVUELTO` · `AUTORIZADO` |
| `AUTORIZADO` / `PUBLICADO` | — (pasa al inventario documental como vigente) | — |
| `NO_PROCEDENTE` | — (cerrada por Procesos con motivo, sin consumir código) | — |
| `CANCELADO` | — (el colaborador desiste de un borrador) | — |

Reglas que se derivan de los requerimientos:

- **Cualquier edición invalida la confirmación** (3.5). La confirmación se guarda ligada a una
  *huella* (hash) del contenido; si el contenido cambia, la huella ya no coincide y hay que volver a
  confirmar.
- **La versión vigente no se toca** mientras una actualización está en curso (2.1, 4.3).
- **Las devoluciones y correcciones no suben la versión oficial** (4.2); solo la autorización final.
- **No procedente no consume código** (2.1) → el código oficial se asigna lo más tarde posible
  (propuesta: al dar Vo.Bo. de Procesos).

---

## 4. Lo que encontré en la plantilla

![Contenido](insumos/plantilla-vista-contenido.png)

- **Tamaño carta**, 2 páginas: **portada** (logo grande, «NOMBRE DEL PROCESO», «Código») y
  **contenido** (marco geométrico de fondo, logo, encabezado con tipo y departamento).
- Secciones del contenido: **1. Objetivo y Propósito · 2. Alcance Operativo · 3. Departamentos y
  Puestos Involucrados · 04. Desarrollo · 05. Control y Responsables** (tabla Elaborado / Revisado /
  Autorizado por).
- **Pie de página:** Código (`PRO-CM01-001`), Versión (`0.0`), Última actualización (`MM/AÑO`),
  Página (`1 de 2`).
- **La marca de agua «COPIA NO AUTORIZADA» ya está en el encabezado**, en las tres secciones.
  Confirmaste que es intencional: el documento que genera el colaborador sale con ella y la
  versión final se regenera sin ella.
- Los adornos (marco, portada) son **imágenes de página completa** detrás del texto; el texto de la
  portada y del encabezado vive en **cuadros de texto flotantes**.
- Fuentes: **Century Gothic** (cuerpo) y **Georgia**; vienen incrustadas en el archivo.

**Huecos de la plantilla frente a los requerimientos:**

| Lo pide el requerimiento | En la plantilla |
|---|---|
| Apartado de **Responsabilidades** (3.3) | No existe (solo «Departamentos y Puestos Involucrados») |
| **Definiciones** opcionales (3.3) | No existe |
| **Control de cambios / historial** en actualizaciones (4.2) | No existe |
| Fechas de elaboró / revisó / autorizó (4.1) | La tabla solo tiene nombres |
| Dos autorizaciones: responsable y Dirección (infografía) | Solo un recuadro «Autorizado por» |
| Plantilla por tipo: Manual, Procedimiento, Protocolo, Política (6) | Solo hay una («Proceso / Procedimiento») |
| Cómo se presenta cada actividad en «04. Desarrollo» (numeración, responsable, imágenes, pies) | Sección vacía, sin ejemplo |

Detalle menor: la numeración mezcla formatos («1.», «2.», «3.» y luego «04.», «05.»).

---

## 5. Discrepancias y vacíos que hay que cerrar

Ordenados por cuánto impactan el diseño.

1. ~~**¿Cuándo se quita la marca de agua?**~~ **Resuelto (decisión 2):** manda el requerimiento
   4.4; se quita solo con el Vo.Bo. final del jefe directo o director.
2. **El «sistema CH».** La infografía dice que, tras el Vo.Bo. de Procesos, el documento *pasa al
   sistema de Capital Humano*, que «gestiona el flujo de autorización». El requerimiento dice que la
   autorización ocurre *dentro del sistema*. ¿CH es otro sistema (por ejemplo, el módulo de Capital
   Humano de Control Interno) al que hay que mandar el documento, o es un rol dentro de este
   sistema? ¿CH aprueba algo o solo enruta? Esto decide si hay integración entre sistemas.
3. **Roles.** El requerimiento define 4 perfiles (Colaborador, Revisor de Procesos, Autorizador,
   Administrador); la infografía, 6 (Colaborador, Procesos, CH, Responsable, Dirección,
   Administrador). Propuesta: tratar *Responsable* y *Dirección* como **niveles** del perfil
   Autorizador, y *CH* según se resuelva el punto 2.
4. **Esquema de autorizaciones.** «Jefe directo o director facultado, *según el esquema
   correspondiente al documento*»: ¿la cadena es siempre responsable → Dirección, o depende del tipo
   de documento o del departamento? ¿Quién es el «responsable» de cada departamento?
5. **Código documental.** `PRO-CM01-001` parece *tipo – clave de área – consecutivo*. Falta la regla
   (prefijos por tipo, de dónde sale `CM01`, si el consecutivo es por tipo, por área o global).
6. **Versiones.** La plantilla trae `0.0`. ¿Un documento nuevo nace como 1.0? ¿Una actualización
   sube a 2.0 o a 1.1? ¿Depende del motivo del cambio?
7. **Plantillas por tipo y secciones faltantes** (ver tabla del punto 4).
8. **Inventario documental.** Para «actualización» y para detectar duplicados necesitamos el
   inventario de documentos existentes. Dijiste que el inventario de Procesos se trabajará después,
   pero **la base debe nacer preparada** para él. Además, los documentos actuales están en Word:
   no tienen «contenido estructurado» (actividades separadas), así que la primera actualización de
   cada uno requiere capturarlo o importarlo (la IA podría proponer la separación en actividades).
9. **Notificaciones.** Ningún insumo lo menciona, pero el flujo lo necesita (avisar a Procesos que
   llegó algo, al colaborador que se lo devolvieron, al autorizador que tiene pendiente).

---

## 6. Solución propuesta

### 6.1 Arquitectura

Misma base que SIVET y Control Interno: **todo dentro de Google Workspace**, sin servidores propios.

```
┌──────────────────────────────────────────────────────────────────┐
│ NAVEGADOR — SPA (HtmlService)                                    │
│  · captura por actividades, pegar con Ctrl+V                     │
│  · compresión de imágenes en el navegador (canvas → WebP/JPEG)   │
│  · vista previa del borrador y confirmación                      │
└───────────────────────────────┬──────────────────────────────────┘
                                │ google.script.run (una sola puerta: ClientApi)
┌───────────────────────────────▼──────────────────────────────────┐
│ APPS SCRIPT — reglas de negocio                                  │
│  Auth/perfiles · Solicitudes · Actividades · Imágenes · IA ·     │
│  Revisión · Autorizaciones · Generación de documentos · Bitácora │
└──────┬────────────────┬─────────────────┬────────────────┬───────┘
       ▼                ▼                 ▼                ▼
 Google Sheets     Google Drive      Google Docs       API de IA
 «BD Procesos»     imágenes,         plantillas →      (UrlFetchApp,
 (datos)           archivos, JSON    Word + PDF        llave en Script
                   de cada revisión                    Properties)
```

- **Acceso solo con la cuenta de Google corporativa** (sin usuario/contraseña propios): la app
  identifica al usuario por su correo y de ahí saca perfil, puesto y departamento.
- **La app corre como la cuenta que publica** (`executeAs: USER_DEPLOYING`, acceso al dominio): los
  usuarios no necesitan permiso sobre la hoja ni las carpetas, y **ningún archivo final es accesible
  directamente**; toda descarga pasa por el servidor, que revisa estado y permisos (requisito 4.4).
- **Un Apps Script ligado a cada hoja** (como SIVET), con los IDs de carpetas y plantillas en
  *Script Properties*: así hay **ambiente de pruebas y de producción** con el mismo código
  ([ambientes.md](ambientes.md)).

### 6.2 Generación del Word/PDF y la marca de agua

Recomendación: **dos plantillas en Google Docs por tipo de documento** — una *preliminar* con la
marca de agua y una *final* sin ella. Para generar:

1. Se copia la plantilla que corresponde (preliminar o final).
2. Se reemplazan los marcadores (`{{NOMBRE_DOCUMENTO}}`, `{{CODIGO}}`, `{{OBJETIVO}}`…).
3. Se insertan las actividades con sus responsables, imágenes y pies.
4. Se exporta a **PDF** y a **Word (.docx)** desde el mismo Google Doc.

Así nunca hay que «quitar» la marca por código (las APIs de Google no la manejan bien): el archivo
final es simplemente **un archivo nuevo generado desde la plantilla limpia**, y los preliminares se
quedan como estaban (requisito 4.4).

**Riesgo a validar antes de construir:** la plantilla actual usa cuadros de texto flotantes, imágenes
de fondo de página completa y Century Gothic. Al pasarla a Google Docs puede perder fidelidad.
Por eso la primera tarea técnica es una **prueba de concepto**: armar la plantilla en Google Docs y
comparar el Word/PDF resultante contra el original. Si no queda bien, el plan B es generar el `.docx`
directamente desde la plantilla de Word (rellenando su XML) — fidelidad total en Word, pero el PDF
sería más complicado.

### 6.3 Imágenes

- Se comprimen **en el navegador** antes de subir: ancho máx. ~1600 px, calidad 0.82, buscando
  100–300 KB. Así no se gasta tiempo del servidor y la subida es rápida.
- Se guardan en Drive en una carpeta por solicitud. Google Docs no acepta WebP al insertar imágenes
  (a confirmar en la prueba de concepto), así que se guarda **WebP para mostrar en la app y una copia
  JPEG/PNG para el documento**. Las capturas con texto pequeño pueden ir en PNG para que no se
  emborronen.
- Cada imagen está ligada a su **actividad por ID**, no por posición: reordenar actividades nunca
  rompe la relación (3.2, 3.4).

### 6.4 IA

**Qué hace:**

| Función | Cuándo | Qué recibe | Qué devuelve |
|---|---|---|---|
| Mejorar redacción | Por actividad o en el análisis | Texto del colaborador | Propuesta; el colaborador acepta, edita o rechaza |
| Identificar responsables | Análisis | Actividades + catálogo de puestos | Puesto por actividad con el fragmento que lo justifica; si es ambiguo → pregunta |
| Objetivo, alcance, responsabilidades, definiciones | Análisis | Todo el proceso | Propuestas editables |
| Detectar faltantes | Análisis | Todo el proceso | Preguntas concretas («¿Quién autoriza?», «¿Qué pasa si se rechaza?») |
| Sugerir orden | Análisis | Actividades | Solo una sugerencia con el porqué; **nunca reordena sola** |
| Pies de imagen | Opcional | Imagen + texto de la actividad | Sugerencia |
| Motivos del control de cambios | Actualizaciones | Versión vigente vs. nueva | Motivos sugeridos para confirmar |

**Cómo se evita que invente** (regla 3.3):

- Respuestas en **JSON con estructura fija**; cada responsable o dato derivado trae el **ID de la
  actividad y el fragmento de texto** de donde salió. El servidor valida que exista; lo que no se
  pueda sustentar se convierte en **pregunta**, no en dato.
- Los puestos se **cotejan contra el catálogo**; si no hay coincidencia clara → pregunta de
  confirmación.
- La IA **propone, la persona decide**: nada de lo que genera entra al documento sin aceptación.
- Se guarda qué propuso la IA y qué aceptó el usuario (trazabilidad).

**Seguridad de la información:** la llave de la API vive en *Script Properties* (nunca en el
navegador); a la IA solo se le manda el texto del proceso y puestos, no datos personales. El
proveedor queda detrás de una sola capa (`ClienteIA`), para poder cambiarlo sin tocar el resto. Se
eligió la API de Gemini en su nivel gratuito; sus límites y su política de datos están en
[ia.md](ia.md).

### 6.5 Pantallas (primer corte)

| Pantalla | Perfil |
|---|---|
| Inicio / Mis solicitudes (estado de cada una, pendientes) | Todos |
| Nueva solicitud: Información general → Desarrollo → Análisis IA → Vista previa y confirmación | Colaborador |
| Bandeja de revisión: observaciones por apartado/actividad, devolver, no procedente, asignar código, Vo.Bo. | Revisor de Procesos |
| Bandeja de autorización: consultar, observar, autorizar o devolver | Autorizador |
| Inventario documental (consulta, versión vigente, historial) | Procesos / Admin (ampliable) |
| Administración: usuarios y perfiles, catálogos, plantillas, parámetros | Administrador |

Estilo visual: el de SIVET / Control Interno (azul `#1E252B`, dorado `#B4A169`, modo claro/oscuro),
que además coincide con los colores de la plantilla institucional.

---

## 7. Base de datos (Google Sheets «BD Procesos»)

> **Ya definida:** el esquema final (22 hojas) está en `src/config/Esquema.gs` y explicado en
> [base-de-datos.md](base-de-datos.md). Esta tabla es el resumen original del análisis.

Una hoja por entidad. No hace falta crearlas a mano: `instalarPruebas()` / `instalarProduccion()`
crean las pestañas, encabezados y carpetas de Drive.

| Hoja | Para qué | Columnas principales |
|---|---|---|
| `Config` | Parámetros editables | CLAVE · VALOR · DESCRIPCION |
| `Usuarios` | Quién entra | ID · CORREO · NOMBRE · PUESTO_ID · ACTIVO |
| `UsuarioPerfiles` | Uno o varios perfiles por persona | USUARIO_ID · PERFIL · DEPARTAMENTO_ID (alcance) · NIVEL_AUTORIZACION |
| `Departamentos` | Catálogo | ID · NOMBRE · CLAVE_CODIGO · RESPONSABLE_ID · DIRECCION_ID |
| `Puestos` | Catálogo (también lo usa la IA) | ID · NOMBRE · DEPARTAMENTO_ID · SINONIMOS |
| `TiposDocumento` | Manual, Procedimiento… | ID · NOMBRE · PREFIJO · PLANTILLA_PRELIMINAR_ID · PLANTILLA_FINAL_ID |
| `Documentos` | **Inventario documental** (lo vigente) | ID · CODIGO · NOMBRE · TIPO · DEPARTAMENTO · VERSION_VIGENTE · FECHA_VIGENCIA · ESTATUS · ARCHIVO_WORD · ARCHIVO_PDF · CON_CONTENIDO_ESTRUCTURADO |
| `Solicitudes` | Cada trámite (nuevo o actualización) | ID (`SOL-2026-0001`) · TIPO_SOLICITUD · TIPO_DOC · DOCUMENTO_ID · NOMBRE · DEPARTAMENTO · ESTADO · NIVEL_ACTUAL · INICIO_PROCESO · FIN_PROCESO · OBJETIVO · ALCANCE · RESPONSABILIDADES · DEFINICIONES · HUELLA_CONTENIDO · HUELLA_CONFIRMADA · ELABORO_* · REVISO_* · AUTORIZO_* · CODIGO · VERSION · CARPETA_ID |
| `Actividades` | Pasos del proceso | ID · SOLICITUD_ID · ORDEN · TEXTO_ORIGINAL · TEXTO_FINAL · PUESTO_ID · RESPONSABLE_CONFIRMADO |
| `Imagenes` | Ligadas a su actividad | ID · ACTIVIDAD_ID · ORDEN · ARCHIVO_WEBP · ARCHIVO_DOC · PIE · PESO |
| `Aclaraciones` | Preguntas de la IA y respuestas | ID · SOLICITUD_ID · ACTIVIDAD_ID · PREGUNTA · RESPUESTA · ESTADO (pendiente / respondida / no aplica / no sé) |
| `Observaciones` | De Procesos o autorizadores | ID · SOLICITUD_ID · REVISION · APARTADO / ACTIVIDAD_ID · AUTOR · TEXTO · ESTADO |
| `Autorizaciones` | Cada firma de la cadena | ID · SOLICITUD_ID · NIVEL · USUARIO · NOMBRE · PUESTO (foto) · DECISION · FECHA · COMENTARIO |
| `Archivos` | Todo lo generado | ID · SOLICITUD_ID · TIPO (preliminar/final) · FORMATO · DRIVE_ID · CON_MARCA · REVISION · FECHA |
| `HistorialCambios` | Control de cambios oficial | DOCUMENTO_ID · VERSION · FECHA · MOTIVO · AUTORIZO |
| `Bitacora` | Trazabilidad (4.3) | FECHA · USUARIO · ACCION · SOLICITUD_ID · DETALLE |
| `UsoIA` | Costos y auditoría de la IA | FECHA · USUARIO · SOLICITUD_ID · OPERACION · MODELO · TOKENS · DURACION |

- **Nombre y puesto se guardan como foto** al momento de cada acción (4.1: si la persona cambia de
  puesto, el documento autorizado no cambia).
- Cada envío a revisión guarda **un JSON con el contenido completo** en Drive: así se puede ver qué
  se revisó en cada vuelta sin llenar la hoja de copias.
- El código oficial y los consecutivos se asignan con **bloqueo** (`LockService`) para que dos
  personas nunca reciban el mismo.

---

## 8. Estructura del proyecto (propuesta)

Siguiendo el esquema de Control Interno (config / services / utils / html, pruebas con node y
subida con clasp a pruebas y producción):

```
Procesos System/
├── README.md                  Qué es, cómo se instala y se sube
├── CLAUDE.md                  Reglas de trabajo del repo
├── appsscript.json · package.json · .claspignore · .gitignore · .clasp.json.example
├── docs/
│   ├── insumos/                 Lo que entregó Procesos (sin modificar) + transcripciones
│   ├── analisis-inicial.md      Este documento
│   ├── ambientes.md · base-de-datos.md · ia.md            (ya escritos)
│   ├── arquitectura.md · flujos.md · roles-y-permisos.md  (conforme se construya)
│   └── manual-usuario.md
├── src/
│   ├── Code.gs                  doGet() e include()
│   ├── ClientApi.gs             Única puerta del navegador al servidor
│   ├── SetupInicial.gs          instalarPruebas() / instalarProduccion() / verificarBase()
│   ├── config/                  Config.gs · Catalogos.gs (perfiles, estados) · Esquema.gs (BD)
│   ├── services/                Auth · Catalogos · Solicitudes · Actividades · Imagenes ·
│   │                            Revision · Autorizaciones · Documentos (generación) ·
│   │                            InventarioDocumental · Notificaciones · Bitacora
│   ├── ia/                      ClienteIA.gs (proveedor) · Prompts.gs · Analisis.gs
│   ├── utils/                   SheetUtils · DriveUtils · Ids · Huella · Fechas
│   └── html/
│       ├── Index.html · styles.html
│       ├── views/                 Una vista por pantalla
│       └── js/                    api · app (router) · componentes/ (actividades, imágenes, …)
├── tests/                     Pruebas en node con Apps Script simulado
└── tools/                     subir.js (pruebas / producción)
```

---

## 9. Preguntas abiertas

**Para Gael (decisiones técnicas):**

1. ~~Dominio y cuenta dueña~~ → resuelto (decisiones 4 y 5).
2. ~~Proveedor de IA~~ → resuelto (decisión 6). Falta que Gael cree la llave en Google AI Studio.
3. ~~Repo y ambientes~~ → resuelto (decisión 7):
   [15GaelNG/Procesos_Control-Interno](https://github.com/15GaelNG/Procesos_Control-Interno).
4. ¿El módulo de Capital Humano de Control Interno tiene ya un catálogo de colaboradores, puestos y
   departamentos que podamos leer, en lugar de capturarlo otra vez?

**Para el área de Procesos (reglas de negocio):**

5. ~~¿Cuándo se quita la marca de agua?~~ → resuelto (decisión 2).
6. ¿Qué es el «sistema CH» y qué hace en el flujo? (punto 5.2)
7. Cadena de autorización: ¿siempre responsable → Dirección? ¿quién es el responsable de cada área?
   ¿qué nombre(s) van en «Autorizado por» de la plantilla?
8. Estructura del código (`PRO-CM01-001`) y regla de versiones.
9. Plantillas por tipo de documento y dónde van Responsabilidades, Definiciones y Control de
   cambios. ¿Cómo debe verse cada actividad en «04. Desarrollo»?
10. Ejemplos de documentos ya aprobados (sirven para enseñarle el estilo a la IA).
11. Catálogo de departamentos y puestos, y lista de usuarios con su perfil.
12. ¿Se avisa por correo en cada cambio de estado?

---

## 10. Plan por fases

| Fase | Entregable | Depende de |
|---|---|---|
| **0. Definición y pruebas de concepto** | Respuestas a las preguntas · plantilla en Google Docs probada (Word + PDF, con y sin marca) · llamada a la IA con respuesta estructurada · compresión de imágenes | Preguntas 1, 2, 5, 9 |
| **1. Base** | Repo, ambientes, `instalarBase()`, acceso con Google, perfiles, catálogos, esqueleto visual | Fase 0 |
| **2. Captura** | Información general, desarrollo por actividades, imágenes con Ctrl+V, guardado de borradores | Fase 1 |
| **3. IA y confirmación** | Análisis, aclaraciones, propuestas aceptables, vista previa, confirmación con huella | Fase 2 · proveedor de IA |
| **4. Documento preliminar** | Word/PDF con marca de agua desde la plantilla | Fase 3 · plantillas |
| **5. Revisión de Procesos** | Bandeja, observaciones por apartado, devolver, no procedente, código, Vo.Bo. | Fase 4 · regla de códigos |
| **6. Autorizaciones y publicación** | Cadena de autorización, documento final limpio, descarga protegida, inventario documental | Fase 5 · esquema de autorizaciones |
| **7. Actualizaciones** | Partir de un documento vigente, control de cambios, historial de versiones | Fase 6 · inventario |
| **8. Cierre** | Notificaciones, tablero, manual de usuario | — |
| Después | Inventario de Procesos (el otro tema que mencionaste) | — |
