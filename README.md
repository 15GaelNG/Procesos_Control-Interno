# Procesos — Sistema de Documentación de Procesos

Web app de Ciudad Maderas para que los colaboradores **documenten sus procesos actividad por
actividad**, con apoyo de **IA** para la redacción, y para que el área de **Procesos** los revise y
los lleve hasta su autorización y publicación. Genera el Word y el PDF sobre la plantilla
institucional, con la marca «COPIA NO AUTORIZADA» hasta el Vo.Bo. final.

Construido 100% sobre **Google Apps Script** (`HtmlService`), con **Google Sheets** como base de
datos, **Google Drive** para archivos y **Google Docs** para generar los documentos.

> **Estado:** fase 1 (base). Ya están el esquema de la base de datos, el instalador y los dos
> ambientes. Sigue la prueba de concepto de plantillas e IA. Ver el
> [análisis inicial](docs/analisis-inicial.md#10-plan-por-fases).

## Documentación

| Documento | Contenido |
|---|---|
| [docs/analisis-inicial.md](docs/analisis-inicial.md) | Problemática, flujo, decisiones, solución y plan por fases |
| [docs/ambientes.md](docs/ambientes.md) | Pruebas y producción, estructura en Drive, instalación, propiedad de los archivos |
| [docs/base-de-datos.md](docs/base-de-datos.md) | Cada hoja y cada columna |
| [docs/ia.md](docs/ia.md) | Proveedor de IA, límites, privacidad y reglas para que no invente |
| [docs/plantillas.md](docs/plantillas.md) | Plantilla preliminar y final, marca de agua y generación de Word/PDF |
| [docs/insumos/](docs/insumos/) | Lo que entregó Procesos: [requerimientos](docs/insumos/requerimientos.md), infografía del flujo y plantilla |

## Estructura

```
.
├── appsscript.json        Manifiesto (zona horaria, servicio avanzado de Drive, web app)
├── src/                   Todo lo que se sube a Apps Script (ver .claspignore)
│   ├── Code.gs              doGet() e include()
│   ├── SetupInicial.gs      instalarPruebas() · instalarProduccion() · verificarBase()
│   ├── config/
│   │   ├── Config.gs          Constantes: nombre, carpeta del proyecto, ambientes, propiedades
│   │   ├── Catalogos.gs       Perfiles, estados y transiciones, motivos de cambio
│   │   └── Esquema.gs         Hojas y columnas de la base de datos (única fuente de verdad)
│   ├── documentos/
│   │   ├── Plantillas.gs      prepararPlantillas() · probarPlantillas() · quitar la marca de agua
│   │   └── Llenado.gs         llenarPlantilla_(): pone los datos en los marcadores {{...}}
│   ├── ia/
│   │   ├── ClienteIA.gs       Única puerta a Gemini (modelo, tope diario, UsoIA)
│   │   ├── Prompts.gs         Instrucciones del análisis
│   │   ├── Analisis.gs        Validador: descarta lo que la IA no puede sustentar
│   │   └── PruebasIA.gs       listarModelosIA() · probarIA()
│   └── utils/
│       ├── SheetUtils.gs      Leer y escribir por nombre de columna
│       ├── Parametros.gs      Lectura de la hoja Config
│       └── Ids.gs             Consecutivos con bloqueo (USR-0001, SOL-2026-0001…)
├── plantillas/            Plantillas de Word con marcadores (Procedimiento.docx = v2)
├── tests/                 Pruebas en node (npm test)
├── tools/
│   ├── subir.js             Sube a pruebas o producción
│   └── plantillas/          crear-plantilla-v2.ps1 (arma la v2 con Word)
└── docs/                  Documentación
```

## Cómo se sube

Requisitos: node, clasp con sesión iniciada (`clasp login`) y los archivos `.clasp.json` (pruebas) y
`.clasp.prod.json` (producción), que se arman con `.clasp.json.example` (no van a git).

```bash
npm run pruebas -- "qué cambió"
```

```bash
npm run produccion -- "qué cambió"
```

Producción solo se sube desde un commit. Detalle y reglas en [docs/ambientes.md](docs/ambientes.md).
