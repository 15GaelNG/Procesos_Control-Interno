# Catálogo de departamentos, áreas y subáreas

Procesos entregó la **lista maestra corregida** el 21/10/2026:
[`insumos/catalogo-departamentos-areas.xlsx`](insumos/catalogo-departamentos-areas.xlsx) (original:
`lista_maestra_area.xlsx`). Trae **27 departamentos, 147 áreas (17 dadas de baja) y 28 subáreas**.
Sustituye al archivo del 19/10/2026, que tenía errores ([qué cambió](#qué-cambió-respecto-al-archivo-del-19102026)).

## Cómo se forma el código

```
P   -   CI 04   -   001
tipo    depto área   consecutivo
```

- **Departamento:** su código (`CI`, `CON`, `AOO`…).
- **Área:** su clave a dos dígitos (`04`). Código del departamento + clave = **cuerpo del código** (`CI04`).
- **Subárea:** no cambia el código; hereda la clave de su área. Procesos es subárea de Análisis de
  Datos y Procesos, así que sus documentos llevan `CI04` (el área Procesos, `CI02`, quedó de baja).

## Cómo se carga

1. `npm run catalogo` convierte el Excel en `src/config/CatalogoInicial.gs` (generado; no se edita a
   mano). Si el Excel rompe sus propias reglas (una clave con dos áreas distintas en el mismo
   departamento, un departamento con dos códigos, una clave que no es número), se detiene sin escribir nada.
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

Como nunca borra, **si en alguna base ya se hubiera cargado el catálogo del 19/10**, antes de importar
el nuevo hay que vaciar a mano `Departamentos`, `Areas` y `Subareas` de esa base (hoy no se ha cargado
en ninguna: Gael no ha tenido acceso a Apps Script).

Cómo se interpreta el archivo (columnas `DEPARTAMENTO`, `CODIGO_DEPARTAMENTO`, `AREA`, `CODIGO_AREA`,
`SUB AREA`; se ignoran los renglones vacíos):

- Cada renglón es un área; si trae subárea, es esa subárea **dentro** del área (el área se repite en
  cada una de sus subáreas y se crea una sola vez).
- Las áreas «(OBSOLETO) …» quedan con `ACTIVO = NO`, el nombre sin el prefijo y la razón en `OBSERVACIONES`.
- La clave se lleva a dos dígitos: la de Post Venta / Administración de oficina viene como «3» y se toma
  como `03` (el convertidor lo avisa).
- El archivo no trae «clave anterior» de las subáreas: `Subareas.CLAVE_ANTERIOR` queda vacía.

## La pantalla «Catálogos»

Para administradores. Muestra cada departamento con sus áreas (cuerpo del código, nombre, subáreas y
notas), con búsqueda por nombre o clave (`CI04`, `procesos`…) y la opción de ver las dadas de baja.
Agregar, corregir y dar de baja desde la pantalla llega en el siguiente paso, junto con los puestos.

## Qué cambió respecto al archivo del 19/10/2026

Lo que aquel archivo dejaba pendiente quedó resuelto: ya no hay claves compartidas (`CI01`, `FCM00`,
`FN03`, el código `CO`), ni claves duplicadas (Compras quedó todo de baja; Urbanización es `CON11`), ni
las 8 áreas «de departamento no localizado» (no vienen). Base de datos ya es subárea de Post Venta (`PV01`).

**Departamentos que ya no vienen (10):** Alebrije, Body Effect, Cobranza Lotes, Dirección General,
Fundación Nascaa, Marketing Digital, Post Venta Administrativo, Post Venta Operativo, Subdirección
General y Unnati.

**Áreas que cambiaron de clave (52).** Algunas claves ahora son de **otra** área (en Contabilidad, `C01`
era Egresos y ahora es Contabilidad; en Proyectos, `P01` era Técnico arquitectónico y ahora es Gestión y
administración):

<details>
<summary>Ver las 52</summary>

| Departamento | Área | Antes | Ahora |
|---|---|---|---|
| ADMINISTRACION OOAM | ADMINISTRACION DE CONSUMOS | `AOO05` | `AOO02` |
| ADMINISTRACION OOAM | COBRANZA OOAM | `AOO06` | `AOO03` |
| ADMINISTRACION OOAM | CONCESIONES Y FACTIBILIDADES | `AOO07` | `AOO04` |
| ADMINISTRACION OOAM | FACTURACION OOAM | `AOO08` | `AOO05` |
| ADMINISTRACION OOAM | SOLUCION AL CLIENTE OOAM | `AOO09` | `AOO06` |
| ADMINISTRACION OOAM | SUMINISTROS, CORTES Y RECONEXIONES | `AOO10` | `AOO07` |
| ARQUITECTURA DEL PAISAJE | ADMINISTRACION ADP | `AP03` | `AP02` |
| ARQUITECTURA DEL PAISAJE | CONSERVACION AMBIENTAL ADP | `AP04` | `AP03` |
| ARQUITECTURA DEL PAISAJE | CREACIONES ADP | `AP05` | `AP04` |
| ARQUITECTURA DEL PAISAJE | MANTENIMIENTO ADP | `AP07` | `AP06` |
| ARQUITECTURA DEL PAISAJE | PROYECTOS ADP | `AP08` | `AP07` |
| BIOFISICA APLICADA | BIOFISICA APLICADA | `SC03` | `SC01` |
| BIOFISICA APLICADA | BIOTECNOLOGIAS | `SC04` | `SC02` |
| BIOFISICA APLICADA | BIOESTRATEGIAS | `SC02` | `SC03` |
| COMERCIALIZACION | CIUDAD MADERAS CASAS - TERRENOS | `COM09` | `COM02` |
| COMERCIALIZACION | RECLUTAMIENTO Y CAPACITACIÓN COMERCIAL | `COM10` | `COM04` |
| COMERCIALIZACION | MERCADOTECNIA COMERCIAL | `COM11` | `COM06` |
| COMUNICACIÓN | COMUNICACIÓN | `CMC01` | `CMC00` |
| COMUNICACIÓN | COMUNICACIÓN INTERNA | `CMC02` | `CMC01` |
| COMUNICACIÓN | AUDIOVISUAL | `CMC04` | `CMC02` |
| COMUNICACIÓN | CONTENIDOS | `CMC05` | `CMC03` |
| COMUNICACIÓN | DISEÑO | `CMC06` | `CMC04` |
| COMUNICACIÓN | INTELIGENCIA | `CMC07` | `CMC05` |
| CONSTRUCCION | COSTOS Y PRESUPUESTOS | `CON03` | `CON02` |
| CONSTRUCCION | ELECTRICIDAD | `CON05` | `CON03` |
| CONSTRUCCION | LABORATORIO DE CONTROL DE CALIDAD | `CON06` | `CON04` |
| CONSTRUCCION | MANTENIMIENTO MAQUINARIA | `CON07` | `CON05` |
| CONSTRUCCION | MANTENIMIENTO | `CON20` | `CON06` |
| CONSTRUCCION | PRODUCCION | `CON21` | `CON07` |
| CONSTRUCCION | MAQUINARIA | `CON09` | `CON08` |
| CONSTRUCCION | MAQUINARIA ESPECIALIZADA | `CON10` | `CON09` |
| CONSTRUCCION | OBRA CIVIL | `CON11` | `CON10` |
| CONSTRUCCION | URBANIZACION | `CON12` | `CON11` |
| CONSTRUCCION | TÉCNICA OOAM | `CON22` | `CON12` |
| CONTABILIDAD | CONTABILIDAD | `C07` | `C01` |
| CONTABILIDAD | EGRESOS | `C01` | `C03` |
| CONTABILIDAD | IMPUESTOS | `C03` | `C04` |
| CONTABILIDAD | INGRESOS | `C02` | `C05` |
| CONTABILIDAD | OOAM - CONTABILIDAD | `C08` | `C07` |
| CONTABILIDAD | REESTRUCTURAS | `C09` | `C08` |
| CONTABILIDAD | MEMORIAL MADERAS | `C10` | `C09` |
| CONTRALORIA | COMISIONES | `CLA10` | `CLA05` |
| FUNDACION CIUDAD MADERAS | ARTE Y CULTURA MADERAS | `FCM15` | `FCM03` |
| FUNDACION CIUDAD MADERAS | FORMACIÓN EDUCATIVA MADERAS | `FCM16` | `FCM05` |
| FUNDACION CIUDAD MADERAS | IMPULSO SOCIAL MADERAS | `FCM17` | `FCM07` |
| FUNDACION CIUDAD MADERAS | REFUGIO MADERAS | `FCM18` | `FCM09` |
| FUNDACION CIUDAD MADERAS | VINCULACIÓN JURÍDICA Y DESARROLLO INTEGRAL | `FCM11` | `FCM10` |
| POST VENTA | CALL CENTER | `PV10` | `PV05` |
| POST VENTA | SPORT MADERAS | `PV11` | `PV07` |
| PROYECTOS | GESTIÓN Y ADMINISTRACIÓN | `P02` | `P01` |
| PROYECTOS | PROYECTOS | `P03` | `P02` |
| PROYECTOS | TÉCNICO ARQUITECTONICO | `P01` | `P03` |

</details>

También salen 39 áreas que ya no vienen (p. ej. Construcción / Almacén `CON02` y Dirección General
`CON04`, Contabilidad / Nómina `C04`, que ahora es Nóminas `C02`) y entran 10 (p. ej. Contabilidad /
Nóminas `C02`, Control Interno / Servicios vehiculares `CI06`, Contraloría / Trámites post venta `CLA06`).

## Pendientes para Procesos

1. **Documentos que ya existen con las claves anteriores.** Procesos pidió conservar el código de los
   documentos ya autorizados (respuesta 4). Con la renumeración, un documento viejo puede llevar un
   cuerpo que hoy es de **otra** área (p. ej. un `P-C01-…` de Egresos, cuando `C01` ahora es
   Contabilidad). ¿Los documentos vigentes conservan su código anterior o se recodifican? Hace falta
   saberlo para cargar el inventario actual (pregunta J) y para que el consecutivo no se confunda
   (pregunta F). El sistema no repite códigos: revisa contra todo lo que ya existe.
2. **Los 10 departamentos que ya no vienen:** confirmar que ya no documentan procesos (o en qué
   departamento quedaron).
3. **Posibles erratas** (se cargan tal cual, corregirlas en el Excel): Control Interno /
   «INSPECCCIONES VEHICULARES» (tres C) y «ADQUISIÓN VEHICULAR» (¿Adquisición?); Contraloría /
   «TRAMITES POST VENTA ( CONTRALORIA POST VENTA)» (espacio tras el paréntesis); Post Venta /
   «ADMINISTRACIÓN DE OFICINA» con clave «3».

**Para notar:** algunos códigos de departamento son iguales a prefijos de tipo de documento (**P**
Proyectos / Procedimiento, **M** Mercadotecnia / Manual, **F** Finanzas / Formato). No rompe nada
porque cada parte tiene su lugar en el código (`P-P01-001` es un procedimiento de Proyectos), pero
conviene que Procesos lo tenga presente.
