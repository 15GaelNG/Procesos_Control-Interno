# Procesos — Sistema de Documentación de Procesos

Web app de Ciudad Maderas para que los colaboradores **documenten sus procesos actividad por
actividad**, con apoyo de **IA** para la redacción, y para que el área de **Procesos** los revise y
los lleve hasta su autorización y publicación. Genera el Word y el PDF sobre la plantilla
institucional, con la marca «COPIA NO AUTORIZADA» hasta el Vo.Bo. final.

Construido 100% sobre **Google Apps Script** (`HtmlService`), con **Google Sheets** como base de
datos, **Google Drive** para archivos y **Google Docs** para generar los documentos.

> **Estado:** fase 0 terminada (13/10/2026): IA y plantilla v2 probadas y validadas por Procesos.
> Sigue la fase 1 (base): ya están los dos ambientes, el instalador y el esquema de la base de datos;
> faltan el acceso con Google, los perfiles, los catálogos y la primera pantalla. Ver el
> [plan por fases](docs/analisis-inicial.md#10-plan-por-fases).

## Documentación

| Documento | Contenido |
|---|---|
| [docs/analisis-inicial.md](docs/analisis-inicial.md) | Problemática, flujo, decisiones, solución y plan por fases |
| [docs/ambientes.md](docs/ambientes.md) | Pruebas y producción, estructura en Drive, instalación, propiedad de los archivos |
| [docs/base-de-datos.md](docs/base-de-datos.md) | Cada hoja y cada columna |
| [docs/ia.md](docs/ia.md) | Proveedor de IA, límites, privacidad y reglas para que no invente |
| [docs/plantillas.md](docs/plantillas.md) | Plantilla preliminar y final, marca de agua y generación de Word/PDF |
| [docs/catalogos.md](docs/catalogos.md) | Departamentos, áreas y subáreas: cómo se cargan y qué quedó pendiente con Procesos |
| [docs/insumos/](docs/insumos/) | Lo que entregó Procesos: [requerimientos](docs/insumos/requerimientos.md), infografía del flujo y plantilla |

## Estructura

```
.
├── appsscript.json        Manifiesto (zona horaria, servicio avanzado de Drive, web app)
├── src/                   Todo lo que se sube a Apps Script (ver .claspignore)
│   ├── Code.gs              doGet(): entrega la web app con la sesión ya incluida · include()
│   ├── SetupInicial.gs      instalarPruebas() · instalarProduccion() · verificarBase() (también actualizan la base)
│   ├── ClientApi.gs         Única puerta del navegador al servidor (funciones api…)
│   ├── UsuariosDePrueba.gs  crearUsuariosDePrueba(): un usuario por perfil, solo en pruebas
│   ├── services/
│   │   ├── Sesion.gs          Quién abrió la app, sus perfiles, sus pantallas y «Ver como» (pruebas)
│   │   └── Catalogos.gs       importarCatalogoInicial() y el árbol departamentos → áreas → subáreas
│   ├── html/
│   │   ├── Index.html         Armazón: menú lateral, barra superior, tema claro/oscuro
│   │   ├── styles.html        Estilos (los de SIVET / Control Interno)
│   │   ├── views/             Una pantalla por archivo, como <template>
│   │   └── js/                api.html (llamadas al servidor) · app.html (arranque, menú, «Ver como», navegación)
│   ├── config/
│   │   ├── Config.gs          Constantes: nombre, carpeta del proyecto, ambientes, propiedades
│   │   ├── Catalogos.gs       Perfiles, estados y transiciones, tipos de cambio, motivos de cambio
│   │   ├── Esquema.gs         Hojas y columnas de la base de datos (única fuente de verdad)
│   │   └── CatalogoInicial.gs Departamentos, áreas y subáreas de Procesos (GENERADO con npm run catalogo)
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
│       ├── Ids.gs             Consecutivos con bloqueo (USR-0001, SOL-2026-0001…)
│       └── Seguridad.gs       soloEditor_(): las funciones del editor no se pueden llamar desde la app
├── plantillas/            Plantillas de Word con marcadores (Procedimiento.docx = v2)
├── tests/                 Pruebas en node (npm test)
├── tools/
│   ├── subir.js             Sube a pruebas o producción
│   ├── catalogo/            convertir-catalogo.js: Excel de Procesos → CatalogoInicial.gs
│   ├── lib/                 Lectores de ZIP y .xlsx sin dependencias
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
