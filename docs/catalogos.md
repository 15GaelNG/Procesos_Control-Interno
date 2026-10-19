# Catálogo de departamentos, áreas y subáreas

Procesos entregó el catálogo el 19/10/2026:
[`insumos/catalogo-departamentos-areas.xlsx`](insumos/catalogo-departamentos-areas.xlsx) (original:
`Catalogo_Final_Departamentos_Areas_Subareas_Codificacion.xlsx`). Trae **37 departamentos, 204 áreas
(5 dadas de baja) y 28 subáreas**.

## Cómo se forma el código

```
P   -   CI 04   -   001
tipo    depto área   consecutivo
```

- **Departamento:** su nomenclatura (`CI`, `CON`, `AOO`…).
- **Área:** su clave a dos dígitos (`04`). Nomenclatura + clave = **cuerpo del código** (`CI04`).
- **Subárea:** no cambia el código; hereda la clave de su área. Procesos es subárea de Análisis de
  Datos y Procesos, así que sus documentos llevan `CI04` (antes `CI02`; se guarda como clave anterior).

## Cómo se carga

1. `npm run catalogo` convierte el Excel en `src/config/CatalogoInicial.gs` (generado; no se edita a
   mano). Si el Excel rompe sus propias reglas (cuerpo ≠ nomenclatura + clave, subárea sin área, un
   departamento con dos nomenclaturas), se detiene sin escribir nada.
2. En el editor de Apps Script del ambiente: primero la instalación (`instalarPruebas` o
   `instalarProduccion`, para crear la hoja `Subareas`), luego **`importarCatalogoInicial()`**.

`importarCatalogoInicial()` **solo agrega lo que falta**: nunca borra ni cambia lo que ya está en la
base, así que se puede correr varias veces. Empata sin importar mayúsculas ni acentos:

| Qué | Cómo lo reconoce |
|---|---|
| Departamento | Por nombre |
| Área | Por departamento + nombre + clave (solo por nombre si es único en el departamento: Capital Humano tiene dos «SUBDIRECCION», la 06 de baja y la 09 activa) |
| Subárea | Por área + nombre |

Si lo que hay en la base difiere del archivo (p. ej. alguien corrigió una clave), se respeta la base y
el registro lo avisa. La carga queda en la `Bitacora` (acción `IMPORTAR_CATALOGO`).

Cómo se interpretó el archivo:

- Las áreas «(OBSOLETO) …» o con «Estatus origen: Inactivo» quedan con `ACTIVO = NO` y el nombre sin el
  prefijo. La razón queda en `OBSERVACIONES`.
- De «Origen de clave» y «Observación» se guarda lo que aporta. Se omiten «Clave validada contra
  catálogo unificado adjunto», «Clave existente conservada» y «Estatus origen: Activo».
- La hoja «Cambios de nombres» no se carga: es la bitácora del ejercicio de homologación. Sus
  renglones **PENDIENTE** están abajo.

## La pantalla «Catálogos»

Para administradores. Muestra cada departamento con sus áreas (cuerpo del código, nombre, subáreas y
notas), con búsqueda por nombre o clave (`CI04`, `procesos`…) y la opción de ver las dadas de baja.
Agregar, corregir y dar de baja desde la pantalla llega en el siguiente paso, junto con los puestos.

## Pendientes para Procesos

El archivo los deja sin decidir; se cargó lo que el archivo trae y se avisa aquí.

**Claves compartidas (el archivo las conserva):**

| Cuerpo | Áreas | Qué falta decidir |
|---|---|---|
| `CI01` | Control Interno / **Contratación** y Control Interno / **Control Interno** | Fusionar o recodificar |
| `FCM00` | Fundación Ciudad Maderas / **Administración de oficinas (00)** y **Fundación Ciudad Maderas** | Fusionar o recodificar |
| `FN03` | Fundación Nascaa / **Adopciones** y **Operativa** | Fusionar o recodificar |
| `CO` | La nomenclatura la usan **Cobranza** (`CO01`) y **Cobranza Lotes** (`CO02`) | ¿Es un solo departamento? |

Mientras dos áreas compartan cuerpo, sus documentos compartirán la numeración del consecutivo (si el
consecutivo se cuenta por tipo + cuerpo; pregunta F del análisis).

**Claves duplicadas para la misma área:** Compras / Administración de compras (`CMP01` vs `CMP04`; se
conservó `CMP01`) y Construcción / Urbanización (`CON12` vs `CON19`; se conservó `CON12`).

**Departamento no localizado** (no se cargaron): Sin área (00), Electricidad (05), Obra civil (11),
Costos y presupuestos (03), Compras construcción/OOAM (04), Construcción administrativa (01), Compras de
construcción y OOAM (02) y Construcción operativa (01).

**Cambio futuro confirmado:** Post Venta Administrativo / Base de datos (`PVA07`) pasará a ser subárea
de Post Venta con `PV01` cuando se actualicen sus procesos. Hasta entonces conserva `PVA07`.

**Para notar:** algunas nomenclaturas de departamento son iguales a prefijos de tipo de documento
(**P** Proyectos / Procedimiento, **M** Mercadotecnia / Manual, **F** Finanzas / Formato). No rompe nada
porque cada parte tiene su lugar en el código (`P-P01-001` es un procedimiento de Proyectos), pero
conviene que Procesos lo tenga presente.
