# Revisión de Procesos (fase 5)

Del envío del colaborador al Vo.Bo. de Procesos. Requerimiento §4.3 (revisión y observaciones), §2.1
(no procedente sin código) y decisiones 10, 11 y 23. Las autorizaciones formales siguen en el sistema
CH (decisión 10): este sistema termina en el Vo.Bo.

Código: `src/services/Revision.gs` (lo puro, probado en `tests/revision.test.js`), las funciones
`api…` de revisión en `src/ClientApi.gs` y las pantallas `views/bandeja.html` · `js/bandeja.html`,
`views/revision.html` · `js/revision.html` y el paso 5 del colaborador (`js/vista-previa.html`).

## El recorrido

```
CONFIRMADO ──enviar──▶ EN_REVISION ──Vo.Bo.──────────▶ EN_AUTORIZACION_CH  (código y versión 0.0)
    ▲                     │  │
    │                     │  └──no procedente──▶ NO_PROCEDENTE  (con motivo; no consume código)
    │                  devolver
    │                     ▼
    └──confirmar──── DEVUELTO  (el colaborador corrige y atiende las observaciones)
```

1. **Enviar** (colaborador, paso 5). Solo si está **confirmada** con el contenido actual (huella) y
   no hay observaciones por atender. Sube `REVISION` (1, 2, 3…), guarda `FECHA_ENVIO_REVISION` y una
   **instantánea** del contenido (JSON en `Solicitudes/<folio>/Instantáneas` y renglón en
   `Instantaneas`). Mientras está en revisión no se puede editar.
2. **Tomar** (revisor, bandeja). La bandeja es común: cualquier revisor toma una solicitud sin asignar
   y queda como su revisor. Nunca la propia (decisión 19). Si dos la toman a la vez, gana el primero
   (candado del script).
3. **Revisar** (revisor asignado). Ve el documento como saldrá y en cada parte tiene **«Observar»**.
4. **Decidir** (revisor asignado), una de tres:
   - **Devolver**: necesita al menos una observación por atender. Pasa a `DEVUELTO`.
   - **No procedente**: con motivo, que ve el colaborador. Se cierra sin código (§2.1).
   - **Vo.Bo.**: sin observaciones por atender y con el contenido que confirmó el colaborador. Asigna
     el **código** y la **versión 0.0**, guarda quién revisó (nombre y puesto, §4.1), cierra las
     observaciones atendidas, guarda otra instantánea y pasa a `EN_AUTORIZACION_CH`.
5. **Corregir** (colaborador). Con la solicitud devuelta corrige en el paso 3 o 4, marca cada
   observación como **atendida** (con una respuesta opcional), **confirma** otra vez y la **reenvía**.
   Regresa a la bandeja del mismo revisor (pestaña «Mías»).

## Observaciones

Cada observación es de un **apartado** del documento (general, nombre, inicio, objetivo, alcance,
puestos, responsabilidades, definiciones, una actividad o el fin) y de una **vuelta de revisión**.

| Estado | Quién lo pone | Cuándo |
|---|---|---|
| `ABIERTA` («Por atender») | Revisor asignado | Al escribirla, o al reabrirla si no quedó |
| `ATENDIDA` | Colaborador | Mientras puede editar la solicitud (devuelta, o ya corregida en borrador o confirmada) |
| `CERRADA` | Revisor asignado | Al verificar la corrección o retirar la observación; con el Vo.Bo., las atendidas se cierran solas |

El colaborador puede atender las observaciones también después de volver a confirmar: si las tuviera
que atender antes, una confirmación adelantada lo dejaría sin poder enviar.

## Bandeja de revisión

Cada solicitud dice **quién la tomó** («La tomó …» o «Nadie la ha tomado») y su barra de progreso.

| Pestaña | Qué hay |
|---|---|
| **Mías** | Las que el revisor tiene en revisión |
| **Sin asignar** | En revisión sin revisor; botón **Tomar** |
| **De otros revisores** | En revisión con otra persona (consulta) |
| **Devueltas** | Con el colaborador para que corrija |
| **En CH** | Con Vo.Bo., en autorización en el sistema CH |

Lo que más tiempo lleva esperando aparece primero, con la fecha de envío y los días. El
**administrador** ve la bandeja **solo para reasignar** (un selector por solicitud, también «Sin
asignar»); no abre ni revisa (decisión 19: ser administrador no da facultades de revisar). Un revisor
puede **liberar** la que tomó para que otro la tome; sus observaciones se quedan.

## Código

`PREFIJO-DEPARTAMENTO+ÁREA-NNN` (decisión 11), p. ej. `P-CI04-001`. Al abrir la decisión, el sistema
propone el siguiente libre: uno más que el mayor usado con ese inicio en `Solicitudes` y `Documentos`, y
que el guardado en `Consecutivos` (serie `COD-P-CI04`). El revisor lo puede corregir; el sistema
revisa el formato y que no esté en uso. Una **actualización** conserva su código (fase 7).

Pendiente con Procesos: si el consecutivo cuenta por tipo + departamento + área (como está) o de otra
forma (pregunta F).

## Correcciones de Procesos (decisión 26)

El revisor asignado, con la solicitud en revisión, tiene un **lápiz** en cada parte del documento
(objetivo, alcance, puestos y responsabilidades, definiciones, inicio, fin y cada actividad con su
responsable). Corrige en una ventana y se guarda (`editarComoRevisor_`): el texto de una actividad va a
`TEXTO_FINAL` (el del colaborador se conserva en `TEXTO_ORIGINAL`), el responsable se coteja con el
catálogo de puestos. Cada corrección:

- queda como **«Corregido por Procesos»** (observación con estado `CAMBIO`: cómo estaba y cómo quedó),
  que el colaborador ve junto a esa parte; no hay que atenderla;
- se anota en la bitácora (`EDITAR_REVISOR`);
- deja su huella en `HUELLA_REVISOR`: el Vo.Bo. se puede dar sobre lo corregido (`contenidoAprobado_`
  acepta la huella confirmada o la del revisor), y así también el resultado de CH y el final.

Si después la devuelve, el colaborador ve los cambios y vuelve a confirmar.

### Corregir el código después del Vo.Bo. (decisión 28)

Mientras se encuentra el inventario anterior de códigos, Procesos puede cambiar la numeración después del
Vo.Bo.: en la revisión («Código del documento») o en Envíos a CH (lápiz junto al código). Mismo tipo,
departamento y área; sin repetir; el consecutivo avanza hasta el número usado. Si ya había documento
generado, hay que volver a generarlo para que lleve el código nuevo.

## Avisos por correo

(decisión 27, `services/Avisos.gs`) Un aviso nunca detiene la acción: si falla, se anota en el registro.

| Cuándo | A quién |
|---|---|
| Llega una solicitud a revisión | `Config → CORREO_PROCESOS` (separados por coma) y todos los revisores activos |
| Procesos la devuelve | Al colaborador, con la lista de observaciones por atender |
| Vo.Bo., autorizada o rechazada en CH, no procedente | Al colaborador |

Cada correo trae el botón para abrir la solicitud. En **pruebas**, los usuarios de prueba
(`@procesos.test`) no tienen buzón: su aviso le llega a la persona real que hizo la acción, con la nota
de para quién era. `Config → AVISOS_CORREO = NO` los apaga. La primera vez hay que dar permiso de enviar
correos corriendo `probarAvisos()` desde el editor.

## Archivos: ver sin descargar

Cada archivo generado tiene **Ver** (visor dentro de la app: el PDF con PDF.js y el Word con
docx-preview, cargados la primera vez) y **Descargar**. Ver revisa el mismo permiso que descargar y se
anota en la bitácora (`VER_ARCHIVO`).

## Quién ve qué

| Perfil | Bandeja | Pantalla de revisión | Acciones |
|---|---|---|---|
| Revisor | Sí | Sí | Tomar, liberar, observar, cerrar o reabrir observaciones, devolver, no procedente, Vo.Bo., generar el preliminar |
| Administrador | Sí, para reasignar | No | Reasignar |
| Soporte CI | No | Consulta (por ahora solo con el enlace: la pantalla «Todas las solicitudes» sigue pendiente) | Ninguna |
| Colaborador | No | — | En su paso 5: enviar, atender observaciones |

Todo queda en la bitácora: envío, tomar, liberar, reasignar, devolver, no procedente y Vo.Bo.
