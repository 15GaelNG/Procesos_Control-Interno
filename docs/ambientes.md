# Ambientes, Drive y propiedad de los archivos

## Los dos ambientes

Cada ambiente es **una hoja de Google Sheets con su propio Apps Script ligado**. El código es el
mismo; lo que cambia entre uno y otro (IDs de carpetas, ambiente, llave de la IA) vive en las
**Propiedades del script** de cada proyecto, nunca en el código.

| | Pruebas | Producción |
|---|---|---|
| Hoja | `BD Procesos - PRUEBAS` · `1AJOfjMlFnGtJ4SxL25Fxk9mED2SQtHhh88AEzpZ_iWA` | `BD Procesos` · `15L-RnbItdWfOouLZ32Ej-61VCPB6cCAYMu3c5UVdYcY` |
| Apps Script | `1SANOMzIklDd-Mj5DIgJYTpu5HW9FcknhXI2jimSg7cUjnxE51W4cX9z1` | `1YRZnhN0vYkoDQXageirH6IOiv6lHzdPDKBtMa8wINfCdXplKGcr27La6` |
| Archivo de clasp | `.clasp.json` | `.clasp.prod.json` |
| Se sube con | `npm run pruebas -- "qué cambió"` | `npm run produccion -- "qué cambió"` |
| Instalación | `instalarPruebas()` | `instalarProduccion()` |
| Carpeta en Drive | `02 Pruebas/` | `01 Producción/` |

Los `.clasp*.json` no van a git (cada quien los arma con `.clasp.json.example`).

### Reglas

- **Todo cambio va primero a pruebas.** A producción solo cuando Gael lo valida, y siempre desde un
  commit: `tools/subir.js` se niega si hay cambios sin commit en `src/` o `appsscript.json`.
- **Nunca editar en el editor de Apps Script**: clasp reemplaza todo el proyecto con lo del repo.
- **La instalación protege los ambientes:** un proyecto instalado como PRUEBAS se niega a instalarse
  como PRODUCCIÓN y viceversa.
- Si cambian los permisos (un servicio nuevo en `appsscript.json`), la app no abre hasta que la
  cuenta dueña corra cualquier función en el editor y acepte los permisos nuevos.

## Estructura en Drive

Todo vive dentro de la carpeta del proyecto
([Procesos System](https://drive.google.com/drive/folders/17AlfoUEj20p8EzJ7zS7WYW2q0bF0Pn_1)).
`instalarPruebas()` / `instalarProduccion()` crean lo que falte:

```
Procesos System/
├── 00 Documentación/          Requerimientos, plantilla original de Word, manuales (compartida)
├── 01 Producción/
│   ├── BD Procesos              La base de datos (Sheets + su Apps Script)
│   ├── Plantillas/              Google Docs por tipo: «<Tipo> - Preliminar» (con marca) y «<Tipo> - Final»
│   ├── Solicitudes/
│   │   └── SOL-2026-0001 - <nombre>/
│   │       ├── Imagenes/          WebP para la app y copia JPEG/PNG para el documento
│   │       ├── Preliminares/      Word/PDF con «COPIA NO AUTORIZADA» (nunca se reemplazan)
│   │       └── Instantaneas/      JSON del contenido en cada confirmación y envío
│   ├── Documentos oficiales/    Versiones autorizadas sin marca de agua (Word y PDF)
│   └── Respaldos/               Copias de la base de datos
└── 02 Pruebas/                Misma estructura, con «BD Procesos - PRUEBAS»
```

- Las subcarpetas de cada solicitud las crea el sistema cuando la solicitud nace.
- El código **busca las carpetas por ID** (guardado en las Propiedades del script), nunca por
  nombre: se pueden renombrar o mover en Drive sin romper nada.
- Los usuarios **no tienen acceso directo** a ninguna carpeta: la web app corre como la cuenta dueña
  (`executeAs: USER_DEPLOYING`) y toda descarga pasa por el servidor, que revisa permisos y estado.
  Así nadie puede bajar un documento final sin que el sistema lo permita (requerimiento §4.4).

## Propiedades del script

| Propiedad | Qué guarda | Quién la llena |
|---|---|---|
| `AMBIENTE` | `PRUEBAS` o `PRODUCCION` | instalación |
| `ID_BD` | ID de la hoja de la base de datos | instalación |
| `ID_CARPETA_AMBIENTE` | `01 Producción` / `02 Pruebas` | instalación |
| `ID_CARPETA_PLANTILLAS` · `ID_CARPETA_SOLICITUDES` · `ID_CARPETA_OFICIALES` · `ID_CARPETA_RESPALDOS` | Subcarpetas del ambiente | instalación |
| `IA_LLAVE` | Llave de la API de la IA (ver [ia.md](ia.md)) | Gael, a mano en el editor |

## Primera instalación de un ambiente

1. Subir el código: `npm run pruebas -- "Instalador de la base"`.
2. Abrir el proyecto en el editor de Apps Script, elegir `instalarPruebas` y dar **Ejecutar**.
3. La primera vez Google pide permisos (Sheets, Drive y servicio externo): aceptarlos con la cuenta
   dueña.
4. Revisar el registro de ejecución: muestra las hojas creadas, las carpetas y el administrador
   registrado. `verificarBase()` debe responder `"correcto": true`.
5. En la hoja `Usuarios`, cambiar el `NOMBRE` del administrador (se registra con su correo).

## Propiedad de los archivos

**Hoy** el propietario de todo es `especialista2datos.ci@ciudadmaderas.com`. **Más adelante** debe
ser `procesos.ci@ciudadmaderas.com`. El sistema está hecho para que ese cambio no toque código:

- Todo vive dentro de una sola carpeta y se encuentra por ID.
- Los Apps Script están **ligados a sus hojas**: cambian de dueño junto con la hoja.

**Opción recomendada: una unidad compartida** (si el administrador de Google Workspace lo permite).
En una unidad compartida los archivos son de la organización, no de una persona: nadie se los
lleva si cambia de puesto y no hace falta transferir nada. Se movería la carpeta del proyecto
completa a la unidad y `procesos.ci` quedaría como administrador.

**Si no hay unidad compartida**, el traspaso es:

1. En Drive, compartir la carpeta del proyecto con `procesos.ci` como editor y **transferirle la
   propiedad** de la carpeta y de todo su contenido (la otra cuenta tiene que aceptar).
2. Con la sesión de `procesos.ci`: abrir cada Apps Script, correr `verificarBase()` para aceptar
   permisos y **crear de nuevo la implementación de la web app** (corre como quien la implementa).
3. Actualizar los IDs de implementación en `tools/subir.js` y volver a capturar `IA_LLAVE` si la llave
   era personal.
4. Si para entonces hay activadores (triggers) programados, recrearlos con la cuenta nueva.
