# Procesos — cómo trabajamos

Sistema de Documentación de Procesos de Ciudad Maderas (para el área de Procesos): Google Apps
Script ligado a la hoja **BD Procesos** (y su copia de pruebas). Qué es, decisiones y plan en
`docs/analisis-inicial.md`; requerimientos oficiales en `docs/insumos/requerimientos.md`.

## Idioma
- Todo lo que se le dice a Gael, la documentación y los commits van **en español**.

## Fuente de verdad
- **El documento de requerimientos manda** (`docs/insumos/requerimientos.md`) sobre la infografía y
  sobre lo platicado. Si algo no está claro, se pregunta y se anota en `docs/analisis-inicial.md`.
- La marca «COPIA NO AUTORIZADA» se quita **solo con el Vo.Bo. final** (jefe directo / director),
  nunca con la validación de Procesos. El final es un archivo nuevo desde la plantilla sin marca.
- La IA **propone y la persona decide**; nunca inventa responsables, actividades, tiempos ni
  requisitos, y nunca reordena actividades por su cuenta (§3.3, §3.4).

## Ambientes (ver docs/ambientes.md)
| | Proyecto | Comando |
|---|---|---|
| Pruebas | BD Procesos - PRUEBAS (`.clasp.json`) | `npm run pruebas -- "qué cambió"` |
| Producción | BD Procesos (`.clasp.prod.json`) | `npm run produccion -- "qué cambió"` |

- Todo cambio va primero a **pruebas**; a producción solo cuando Gael lo valida y desde un commit.
- **Nunca editar en el editor de Apps Script**: clasp reemplaza el proyecto completo.
- No levantar servidores locales para probar: se prueba con node (`vm`) y Gael revisa en pruebas.

## Reglas del código
- Las constantes de nivel superior van en `src/config/`. Una constante declarada dos veces tira todo
  el servidor. Una constante **no debe leer otra de otro archivo** al declararse (Apps Script no
  garantiza el orden de carga); dentro de funciones sí se puede.
- Las funciones que el navegador no debe llamar terminan en `_`.
- La base de datos se define solo en `src/config/Esquema.gs`; si cambia, se actualiza
  `docs/base-de-datos.md` en el mismo commit. Columnas nuevas, siempre al final.
- Se lee y escribe por **nombre de columna** (`leerTabla_`, `agregarFila_`, `actualizarFila_`).
- Nada se borra físicamente: `ACTIVO = NO` o `ELIMINADA = SI`.
- Los IDs de carpetas, ambiente y llave de la IA viven en las Propiedades del script, nunca en el
  código. La llave de la IA jamás va al repo, a la hoja ni al navegador.

## Trampas de Apps Script en archivos `.html` (aprendidas en Control Interno)
- **Nunca `//` seguido de texto en código real de un `.html`:** Apps Script lo toma como comentario
  aunque esté dentro de un string y corta la línea. Las URLs en JS van como `'https:\/\/…'`.
- **Nunca `/*` dentro de un string** (p. ej. `accept="image/*"` en JS): se come hasta el siguiente `*/`.
- **Nunca escribir los símbolos de scriptlet** (menor-que + signo de interrogación, y su cierre)
  dentro de un `.html` que se evalúa como plantilla, ni siquiera en un comentario.
