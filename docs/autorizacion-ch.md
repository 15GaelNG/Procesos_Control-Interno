# Autorización en CH, documento final e inventario (fase 6)

Lo que pasa después del Vo.Bo. de Procesos. Requerimiento §4.2 (historial de versiones), §4.4 (marca de
agua y documento final) y decisiones 10, 14, 15 y 24. Este sistema **no se conecta con CH**: Procesos
sube los archivos y registra aquí lo que CH resolvió.

Código: `src/services/AutorizacionCH.gs`, `src/services/Inventario.gs`, `generarFinal_` en
`src/services/Documentos.gs` (lo puro, probado en `tests/autorizacion-ch.test.js` y
`tests/documentos.test.js`) y las pantallas `views/envios-ch.html` · `js/envios-ch.html` y
`views/inventario.html` · `js/inventario.html`.

## El recorrido

```
EN_AUTORIZACION_CH ──(Procesos lo sube a CH y lo registra)──▶ en CH, esperando resultado
        │
        ├── CH autorizó ──▶ AUTORIZADO: entra al inventario, historial de versiones y documento final sin marca
        └── CH rechazó ───▶ RECHAZADO_CH: regresa al panel de Procesos con el motivo como observación; un
                            revisor la retoma, la ajusta (o la devuelve al colaborador) y le da otro Vo.Bo.
                            con el mismo código (decisión 43)
EN_AUTORIZACION_CH ──(no va a CH)──▶ RESGUARDADO: queda en el inventario como resguardo interno (decisión 44)
```

## Pantalla «Envíos a CH» (revisores)

| Pestaña | Qué hay | Qué se hace |
|---|---|---|
| **Por subir** | Con Vo.Bo. y sin registro de subida | **Generar archivos para CH** (si no hay), descargar el PDF y el Word con «COPIA NO AUTORIZADA» y **registrar que ya se subió**: fecha (entre el Vo.Bo. y hoy) y, si CH da uno, su folio |
| **En CH** | Subidas, esperando resultado | Registrar lo que resolvió: **lo autorizó** (nombre y puesto del autorizador final, y la fecha, como aparecen en CH) o **lo rechazó** (motivo) |
| **Resueltas** | Los últimos 50 resultados | Consulta; descarga del final. Si faltó generarlo, **Generar documento final** |

Los archivos para CH son los preliminares generados **después del Vo.Bo.** (ya llevan el código y quién
revisó) y del contenido confirmado. Cualquier revisor registra en CH, nunca de una solicitud que él
mismo elaboró (decisión 19); el administrador no.

## Autorizado

En un solo paso (con candado, para que no se registre dos veces):

1. La solicitud pasa a `AUTORIZADO` con `AUTORIZO_NOMBRE`, `AUTORIZO_PUESTO` y `FECHA_AUTORIZACION`
   (decisión 14: en el documento solo va el autorizador final). La versión de un documento nuevo
   queda en **0.0** (respuesta 5 de Procesos: 0.0 es la versión inicial hasta su primera
   autorización; la siguiente actualización será 0.1 o 1.0).
2. Entra al **inventario** (`Documentos`) como `VIGENTE`, con `ORIGEN = SISTEMA`.
3. Se anota en el **historial de versiones** (`HistorialCambios`): «Emisión inicial del documento», con
   quién lo elaboró y quién lo autorizó.
4. Enseguida la pantalla pide el **documento final**: otro archivo desde la plantilla **sin marca**
   («Procedimiento - Final»), con la fecha de autorización de CH en el documento. Los preliminares
   conservan su leyenda (§4.4). Si la generación falla, la solicitud ya quedó autorizada y en
   «Resueltas» aparece «Generar documento final».

## Rechazado (decisión 43, respuesta de Procesos del 03/11/2026)

- La solicitud pasa a **`RECHAZADO_CH`** («Rechazado en CH») y su Vo.Bo. se borra (`REVISO_*`), porque hay que
  volver a darlo.
- El motivo de CH se vuelve una **observación** general por atender («Rechazado en el sistema CH: …»), a nombre
  de quien registró el rechazo. Se avisa al colaborador y a su revisor.
- Aparece en la bandeja, pestaña **«Rechazadas en CH»**. Un revisor la **retoma**: pasa a `EN_REVISION` con él.
  Ahí la corrige (decisión 26), la devuelve al colaborador si necesita algo de él, cierra la observación y da un
  nuevo Vo.Bo. **con el mismo código** (ya está en CH).

## Resguardo interno: lo que no pasa por CH (decisión 44)

Consultas internas o temas sensibles que no conviene publicar en CH (respuesta de Procesos del 03/11/2026). En
«Por subir», **«No va a CH: resguardar en el sistema»** pide el motivo y:

- La solicitud queda **`RESGUARDADO`** (`MOTIVO_CIERRE` = el motivo).
- Entra al **inventario** con estatus **`RESGUARDO`** («Resguardo interno (sin CH)») y con los archivos generados
  después del Vo.Bo. (hay que generarlos antes). **Conservan «COPIA NO AUTORIZADA»**: nadie lo autorizó en CH y la
  marca solo se quita con esa autorización (§4.4).
- Se anota en su historial de versiones («Resguardo interno, no pasa por CH: …»). Se puede actualizar después,
  como uno vigente.

## Inventario documental

Revisores, administradores y Soporte CI lo consultan: código, nombre, tipo, departamento y área,
versión vigente, desde cuándo, origen, el **historial de versiones** y la descarga del PDF y Word
finales. La descarga se revisa en el servidor (§4.4): el final lo bajan quien puede ver la solicitud
(quien la elaboró, Procesos y Soporte CI) y el administrador; los preliminares, solo quien puede ver la
solicitud.

El inventario anterior de Procesos no se considera por ahora (decisión 37).
