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
        └── CH rechazó ───▶ DEVUELTO: el motivo llega al colaborador como observación; corrige,
                            confirma, reenvía y vuelve a pasar por Procesos (mismo código)
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

## Rechazado (provisional, pregunta D)

Mientras Procesos no defina otra cosa:

- La solicitud regresa a `DEVUELTO` y su Vo.Bo. se borra (`REVISO_*`), porque hay que volver a darlo.
- El motivo de CH se vuelve una **observación** general por atender («Rechazado en el sistema CH: …»),
  a nombre de quien registró el rechazo.
- El colaborador la atiende, confirma y reenvía; regresa al mismo revisor, que da un nuevo Vo.Bo. **con
  el mismo código** (ya está en CH) y versión 0.0.

## Inventario documental

Revisores, administradores y Soporte CI lo consultan: código, nombre, tipo, departamento y área,
versión vigente, desde cuándo, origen, el **historial de versiones** y la descarga del PDF y Word
finales. La descarga se revisa en el servidor (§4.4): el final lo bajan quien puede ver la solicitud
(quien la elaboró, Procesos y Soporte CI) y el administrador; los preliminares, solo quien puede ver la
solicitud.

Pendiente con Procesos: cargar su inventario actual (pregunta J, con `ORIGEN = HISTORICO`) y qué hacer
con los documentos que no pasan por CH (pregunta I).
