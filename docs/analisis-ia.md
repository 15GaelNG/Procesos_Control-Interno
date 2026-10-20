# Análisis con IA y confirmación (fase 3)

Pasos 4 y 5 de una solicitud. Requerimiento §3.3 (análisis y preguntas), §3.4 (secuencia y
confirmación) y §3.5 (borrador y confirmación del colaborador). Proveedor, límites y validador:
[ia.md](ia.md).

## Paso 4 · Análisis con IA

Con el botón **«Analizar con IA»** el sistema:

1. Arma el proceso: nombre, departamento, inicio, actividades (con el responsable que el colaborador ya
   indicó), fin, el catálogo de puestos y **las respuestas que ya dio** a preguntas anteriores.
2. **Oculta los datos sensibles** (correos, CURP, RFC, cuentas o tarjetas, teléfonos y montos) con
   marcas como `[CORREO 1]` (`src/utils/Privacidad.gs`). Google nunca recibe esos datos.
3. Pide a Gemini un JSON con: redacción de cada actividad, responsable con el fragmento del texto que lo
   sustenta, objetivo, alcance, responsabilidades, definiciones, preguntas y sugerencias de orden.
4. **Valida** la respuesta (`validarAnalisis_`): descarta responsables sin sustento, actividades
   inventadas y preguntas repetidas; avisa si la redacción trae cifras que no estaban.
5. Restaura los datos ocultos y guarda **propuestas** (`PropuestasIA`) y **preguntas** (`Aclaraciones`).
   Lo pendiente de un análisis anterior queda como `REEMPLAZADA`; lo ya decidido o respondido se respeta.

La pantalla muestra:

| Sección | Qué hace la persona |
|---|---|
| **Preguntas** | Responde con texto, «No aplica» o «No lo sé». La del responsable («¿Qué puesto realiza esta actividad?») deja la respuesta como responsable de la actividad, cotejada con el catálogo |
| **Propuestas por actividad** | Redacción y responsable: **Aceptar**, **Editar** (escribe su versión) o **Descartar**. Se ve «Ahora» junto a «Propuesta» |
| **Sugerencias de orden** | Solo informan («Entendido» / «Descartar»). La IA nunca reordena; si está de acuerdo, reordena en el paso 3 |
| **Objetivo, alcance, responsabilidades y definiciones** | Puede usar la propuesta y ajustarla, o escribirlo a mano y «Guardar». Responsabilidades y definiciones van un renglón por elemento («Puesto: …») |
| **Ya decidiste** | Lista de lo decidido, para consulta |

Después de responder, **«Volver a analizar»** manda las respuestas para que la IA mejore la redacción
con esa información (sin volver a preguntar). Si hay propuestas sin decidir, avisa que se reemplazarán.

Reglas:
- Si la actividad cambió después del análisis, su propuesta ya no se puede aceptar (pide volver a
  analizar).
- Aceptar la redacción la deja como texto final; si después se edita a mano en el paso 3, vuelve a ser
  del colaborador.
- **Sin IA** (`Config → IA_ACTIVA = NO`, sin cuota o falla): el botón se deshabilita y todo se escribe a
  mano (responsables en el paso 3; objetivo, alcance y demás aquí). El sistema funciona igual.

## Paso 5 · Vista previa y confirmación

El borrador integral en el orden de la plantilla: datos generales, **1. Objetivo, 2. Alcance, 3. Puestos
involucrados**, Responsabilidades y Definiciones (si hay; si no, se quitan y se renumera, como en el
documento) y **Desarrollo** (cada actividad con su responsable, texto e imágenes con «Imagen n.m – pie»).

**Para confirmar hace falta** (decisión 21):
- cada actividad con texto y **responsable**;
- objetivo y alcance;
- **todas las preguntas respondidas** (vale «No aplica» o «No lo sé»).

Si falta algo, la pantalla lo lista con botones al paso 3 o 4. Si no falta nada, pregunta:
**«¿El documento describe correctamente cómo se realiza el proceso en tu departamento?»**

- **Sí** → la solicitud queda `CONFIRMADO` con la huella de exactamente lo que vio
  (`HUELLA_CONFIRMADA`, `FECHA_CONFIRMACION`, bitácora `CONFIRMAR_SOLICITUD`). Si el contenido cambió
  desde que abrió la vista previa (otra pestaña), no confirma y pide revisar de nuevo.
- **Necesita ajustes** → elige qué corregir y lo lleva al paso 3 o al 4.

La confirmación **no es el Vo.Bo. de Procesos**. Cualquier cambio posterior (texto, imagen, decisión,
objetivo…) la regresa a `BORRADOR` y hay que volver a confirmar (§3.5). Lo siguiente es generar el
preliminar y enviarlo a revisión (fases 4 y 5).

## Dónde está el código

- `src/services/AnalisisSolicitud.gs`: entrada para la IA, propuestas, decisiones, respuestas, textos
  derivados, vista previa y confirmación. Lo puro, en `tests/analisis-solicitud.test.js`.
- `src/ia/Prompts.gs` y `src/ia/Analisis.gs` (instrucciones y validador), `src/utils/Privacidad.gs`.
- Pantallas: `src/html/views/analisis.html`, `views/vista-previa.html`, `js/analisis.html`,
  `js/vista-previa.html`.

Probado el 21/10/2026 en una vista previa local que corre estas mismas funciones con una IA simulada:
datos ocultos y restaurados, preguntas respondidas (la del responsable se ligó al catálogo),
propuestas aceptadas, editadas y descartadas, confirmación, regreso a borrador al editar y rechazo de
una confirmación con contenido cambiado. **Falta probarlo con Gemini real en pruebas.**
