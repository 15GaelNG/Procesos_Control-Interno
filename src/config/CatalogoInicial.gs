/**
 * CATÁLOGO INICIAL DE DEPARTAMENTOS, ÁREAS Y SUBÁREAS — GENERADO, NO SE EDITA A MANO.
 *
 * Sale de docs/insumos/catalogo-departamentos-areas.xlsx (hoja «Catálogo para códigos») con
 * `npm run catalogo` (tools/catalogo/convertir-catalogo.js). importarCatalogoInicial() lo carga a la
 * base sin borrar ni cambiar lo que ya exista. Después, el catálogo se administra en la base.
 *
 * 37 departamentos · 204 áreas · 28 subáreas.
 */
const CATALOGO_INICIAL = [
  { nombre: "ADMINISTRACIÓN", clave: "A", areas: [
    { nombre: "ADMINISTRACIÓN", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTROL DE ARCHIVO", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CAJAS", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACIÓN DE PAGOS", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CUENTAS POR PAGAR", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "FACTURACIÓN", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "RECEPCION DE ADMINISTRACION", clave: "07", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "IMPULSO", clave: "08", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] },
    { nombre: "PERSONAL DOMESTICO", clave: "09", activo: "SI", observaciones: "Incorporada de lista maestra; clave original; Agregado de reporte homologación | No figura en catálogo unificado adjunto; conservado sin eliminar.", subareas: [] }
  ] },
  { nombre: "ADMINISTRACIÓN DE OFICINAS", clave: "AO", areas: [
    { nombre: "ADMINISTRACIÓN DE OFICINAS", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACION DE PAGOS", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MANTENIMIENTO DE OFICINAS", clave: "03", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "ADMINISTRACIÓN OOAM", clave: "AOO", areas: [
    { nombre: "ADMINISTRACIÓN OOAM", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "SAAC", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "SUPERVISION DE SUMINISTRO", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "COBRANZA", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACIÓN DE CONSUMOS", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "COBRANZA OOAM", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONCESIONES Y FACTIBILIDADES", clave: "07", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "FACTURACIÓN OOAM", clave: "08", activo: "SI", observaciones: "", subareas: [
        { nombre: "DEVOLUCIONES Y TRASPASOS", claveAnterior: "", observaciones: "" },
        { nombre: "DOMICILIACIONES", claveAnterior: "", observaciones: "" },
        { nombre: "ESTADOS DE CUENTA", claveAnterior: "", observaciones: "" }
      ] },
    { nombre: "SOLUCIÓN AL CLIENTE OOAM", clave: "09", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "SUMINISTROS, CORTES Y RECONEXIONES", clave: "10", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "ALEBRIJE", clave: "ALE", areas: [
    { nombre: "ADMINISTRACION NASCAA", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ALEBRIJE-ADOPCIONES", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CLINICA", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ALEBRIJE-OPERACIONES", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ALEBRIJE", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ALEBRIJE-TIERRA PARAISO", clave: "06", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] }
  ] },
  { nombre: "ARQUITECTURA DEL PAISAJE", clave: "AP", areas: [
    { nombre: "ARQUITECTURA DEL PAISAJE", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MANTENIMIENTO DE JARDINES", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACIÓN ADP", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONSERVACIÓN AMBIENTAL ADP", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CREACIONES ADP", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MANTENIMIENTO (MANTENIMIENTO DE AMENIDADES)", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MANTENIMIENTO ADP", clave: "07", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "PROYECTOS ADP", clave: "08", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "BIOFÍSICA APLICADA", clave: "SC", areas: [
    { nombre: "SCIO", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "BIOESTRATEGÍAS", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "BIOFISICA APLICADA", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "BIOTECNOLOGÍAS", clave: "04", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "BODY EFFECT", clave: "BE", areas: [
    { nombre: "BODY EFFECT", clave: "01", activo: "SI", observaciones: "Incorporada de lista maestra; clave original; Estatus origen: Activo | No figura en catálogo unificado adjunto; conservado sin eliminar.", subareas: [] },
    { nombre: "SALUD", clave: "02", activo: "SI", observaciones: "Incorporada de lista maestra; clave original; Estatus origen: Activo | No figura en catálogo unificado adjunto; conservado sin eliminar.", subareas: [] },
    { nombre: "VENTAS", clave: "03", activo: "SI", observaciones: "Incorporada de lista maestra; clave original; Estatus origen: Activo | No figura en catálogo unificado adjunto; conservado sin eliminar.", subareas: [] }
  ] },
  { nombre: "CAPITAL HUMANO", clave: "CH", areas: [
    { nombre: "ATRACCION DE TALENTO", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CAPACITACION Y DESARROLLO DE PERSONAL", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "COMUNICACION", clave: "03", activo: "NO", observaciones: "Estatus origen: Inactivo; OBSOLETO, EL AREA YA NO PERTENECE A CAPITAL HUMANO", subareas: [] },
    { nombre: "DESARROLLO ORGANIZACIONAL", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "RELACIONES LABORALES", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "SUBDIRECCION", clave: "06", activo: "NO", observaciones: "Estatus origen: Inactivo; OBSOLETO, ESTE CÓDIGO NUNCA SE UTILIZÓ PARA DIRECCIÓN, EL CÓDIGO CORRECTO ES 10", subareas: [] },
    { nombre: "DIRECCION", clave: "07", activo: "NO", observaciones: "Estatus origen: Inactivo; OBSOLETO, ESTE CÓDIGO NUNCA SE UTILIZÓ PARA DIRECCIÓN, EL CÓDIGO CORRECTO ES 10", subareas: [] },
    { nombre: "ADMINISTRACION DE OFICINAS", clave: "08", activo: "NO", observaciones: "Estatus origen: Inactivo; OBSOLETO, EL AREA YA NO PERTENECE A CAPITAL HUMANO", subareas: [] },
    { nombre: "SUBDIRECCION", clave: "09", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CAPITAL HUMANO", clave: "10", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "HABITOS SALUDABLES", clave: "11", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "HAPPINESS ORGANIZACIONAL", clave: "12", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] }
  ] },
  { nombre: "CIUDAD MADERAS", clave: "CM", areas: [
    { nombre: "CIUDAD MADERAS", clave: "01", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "COBRANZA", clave: "CO", areas: [
    { nombre: "COBRANZA", clave: "01", activo: "SI", observaciones: "", subareas: [
        { nombre: "ATENCIÓN AL CLIENTE", claveAnterior: "", observaciones: "" },
        { nombre: "COBRANZA JURÍDICO", claveAnterior: "", observaciones: "" }
      ] }
  ] },
  { nombre: "COBRANZA GPH", clave: "GPH", areas: [
    { nombre: "COBRANZA GPH", clave: "00", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "COBRANZA Y SERVICIO AL CLIENTE", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTROL ADMINISTRATIVO", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "FLOTILLAS", clave: "03", activo: "NO", observaciones: "Estatus origen: Inactivo; OBSOLETO, EL AREA YA NO PERTENECE A COBRANZA GPH", subareas: [] }
  ] },
  { nombre: "COBRANZA LOTES", clave: "CO", areas: [
    { nombre: "CALIDAD", clave: "02", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] }
  ] },
  { nombre: "COMERCIALIZACION", clave: "COM", areas: [
    { nombre: "COMERCIALIZACION", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "SOCIO MADERAS", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "FACTOR HUMANO COMERCIAL", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "BUSINESS INTELLIGENCE", clave: "04", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] },
    { nombre: "CIUDAD MADERAS CASAS PREMIUM", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "COMERCIALIZACION SM", clave: "06", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] },
    { nombre: "PERSONAL DOMESTICO", clave: "07", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] },
    { nombre: "PROYECTOS ESPECIALES", clave: "08", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CIUDAD MADERAS CASAS - TERRENOS", clave: "09", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] },
    { nombre: "RECLUTAMIENTO Y CAPACITACIÓN COMERCIAL", clave: "10", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] },
    { nombre: "MERCADOTECNIA COMERCIAL", clave: "11", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] }
  ] },
  { nombre: "COMPRAS", clave: "CMP", areas: [
    { nombre: "COMPRAS", clave: "00", activo: "SI", observaciones: "Incorporada de lista maestra; clave original; Estatus origen: Activo | No figura en catálogo unificado adjunto; conservado sin eliminar.", subareas: [] },
    { nombre: "ADMINISTRACION DE COMPRAS", clave: "01", activo: "SI", observaciones: "Incorporada de lista maestra; clave original; Estatus origen: Activo | No figura en catálogo unificado adjunto; conservado sin eliminar.", subareas: [] },
    { nombre: "SUMINISTROS", clave: "02", activo: "SI", observaciones: "Incorporada de lista maestra; clave original; Estatus origen: Activo | No figura en catálogo unificado adjunto; conservado sin eliminar.", subareas: [] },
    { nombre: "VIAJES", clave: "03", activo: "SI", observaciones: "Incorporada de lista maestra; clave original; Estatus origen: Activo | No figura en catálogo unificado adjunto; conservado sin eliminar.", subareas: [] },
    { nombre: "COMPRAS - BAJIO", clave: "05", activo: "SI", observaciones: "Incorporada de lista maestra; clave original; Agregado de reporte homologación | No figura en catálogo unificado adjunto; conservado sin eliminar.", subareas: [] },
    { nombre: "COMPRAS - SUR", clave: "06", activo: "SI", observaciones: "Incorporada de lista maestra; clave original; Agregado de reporte homologación | No figura en catálogo unificado adjunto; conservado sin eliminar.", subareas: [] }
  ] },
  { nombre: "COMUNICACIÓN", clave: "CMC", areas: [
    { nombre: "COMUNICACIÓN", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "COMUNICACIÓN INTERNA", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MARKETING DIGITAL", clave: "03", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] },
    { nombre: "AUDIOVISUAL", clave: "04", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] },
    { nombre: "CONTENIDOS", clave: "05", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] },
    { nombre: "DISEÑO", clave: "06", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] },
    { nombre: "INTELIGENCIA", clave: "07", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] }
  ] },
  { nombre: "CONSTRUCCIÓN", clave: "CON", areas: [
    { nombre: "ADMINISTRACIÓN DE CONSTRUCCIÓN", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ALMACEN", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "COSTOS Y PRESUPUESTOS", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "DIRECCION GENERAL", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ELECTRICIDAD", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "LABORATORIO DE CONTROL DE CALIDAD", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MANTENIMIENTO MAQUINARÍA", clave: "07", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MANTENIMIENTO Y PRODUCCION", clave: "08", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MAQUINARÍA", clave: "09", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MAQUINARÍA ESPECIALIZADA", clave: "10", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "OBRA CIVIL", clave: "11", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "URBANIZACION", clave: "12", activo: "SI", observaciones: "Duplicidad origen: 12, 19; conserva 12 hasta decisión.", subareas: [] },
    { nombre: "MANTENIMIENTO", clave: "20", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] },
    { nombre: "PRODUCCIÓN", clave: "21", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] },
    { nombre: "TÉCNICA OOAM", clave: "22", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [
        { nombre: "OOAM - INFRAESTRUCTURA", claveAnterior: "CON13", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento; Cambio confirmado por el usuario: subárea de Técnica OOAM, hereda CON22. Código anterior CON13." },
        { nombre: "OOAM - OPERACIÓN Y SANEAMIENTO", claveAnterior: "CON15", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento; Cambio confirmado por el usuario: subárea de Técnica OOAM, hereda CON22. Código anterior CON15." },
        { nombre: "OOAM - PROYECTOS Y SUPERVISIÓN", claveAnterior: "CON16", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento; Cambio confirmado por el usuario: subárea de Técnica OOAM, hereda CON22. Código anterior CON16." },
        { nombre: "OOAM- OBRA CIVIL", claveAnterior: "CON14", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento; Cambio confirmado por el usuario: subárea de Técnica OOAM, hereda CON22. Código anterior CON14." },
        { nombre: "OPERACIÓN E INNOVACIÓN DE AGUA POTABLE", claveAnterior: "CON17", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento; Cambio confirmado por el usuario: subárea de Técnica OOAM, hereda CON22. Código anterior CON17." },
        { nombre: "SUBDIRECCIÓN TÉCNICA OOAM", claveAnterior: "CON18", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento; Cambio confirmado por el usuario: subárea de Técnica OOAM, hereda CON22. Código anterior CON18." }
      ] }
  ] },
  { nombre: "CONTABILIDAD", clave: "C", areas: [
    { nombre: "EGRESOS", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "INGRESOS", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "IMPUESTOS", clave: "03", activo: "SI", observaciones: "", subareas: [
        { nombre: "COSTOS", claveAnterior: "C05", observaciones: "Cambio confirmado: Costos es subárea de Impuestos y hereda C03; código anterior C05." }
      ] },
    { nombre: "NOMINA", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CASAS", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTABILIDAD", clave: "07", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "OOAM - CONTABILIDAD", clave: "08", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "REESTRUCTURAS", clave: "09", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MEMORIAL MADERAS", clave: "10", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] }
  ] },
  { nombre: "CONTRALORIA", clave: "CLA", areas: [
    { nombre: "CONTRALORIA", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTRALORIA CORPORATIVA", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTRATOS", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CASAS", clave: "04", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] },
    { nombre: "COA", clave: "05", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] },
    { nombre: "CONTRALORIA POST VENTA", clave: "06", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] },
    { nombre: "UPGRADE", clave: "07", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] },
    { nombre: "TRAMITES ESPECIALES", clave: "08", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] },
    { nombre: "TRAMITES POST VENTA", clave: "09", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] },
    { nombre: "COMISIONES", clave: "10", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] }
  ] },
  { nombre: "CONTRATACIÓN Y TITULACIÓN", clave: "CT", areas: [
    { nombre: "CONTRATACIÓN", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "TITULACIÓN", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTRATACIÓN Y TITULACIÓN", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTRATACIÓN Y TITULACIÓN - CASAS PREMIUM", clave: "04", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] },
    { nombre: "CONTRATACIÓN Y TITULACIÓN - MEMORIAL MDS", clave: "05", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] }
  ] },
  { nombre: "CONTROL INTERNO", clave: "CI", areas: [
    { nombre: "CONTRATACION", clave: "01", activo: "SI", observaciones: "Incorporada de lista maestra; clave original; Estatus origen: Activo | No figura en catálogo unificado adjunto; conservado sin eliminar.", subareas: [] },
    { nombre: "CONTROL INTERNO", clave: "01", activo: "SI", observaciones: "", subareas: [
        { nombre: "ADQUISICIÓN VEHICULAR", claveAnterior: "", observaciones: "" },
        { nombre: "GESTORÍA VEHICULAR", claveAnterior: "", observaciones: "" },
        { nombre: "INSPECCIONES CELULARES", claveAnterior: "", observaciones: "" },
        { nombre: "INSPECCIONES VEHICULARES", claveAnterior: "", observaciones: "" },
        { nombre: "LINEAS TELEFONICAS", claveAnterior: "CI08", observaciones: "Líneas Telefónicas pertenece al área Control Interno: cuerpo CI01; anterior CI08." },
        { nombre: "SERVICIOS VEHICULARES", claveAnterior: "CI06", observaciones: "Servicios Vehiculares pertenece al área Control Interno: cuerpo CI01; anterior CI06." }
      ] },
    { nombre: "AUDITORÍA Y CALIDAD", clave: "03", activo: "SI", observaciones: "", subareas: [
        { nombre: "AUDITORÍA", claveAnterior: "", observaciones: "" },
        { nombre: "CALIDAD", claveAnterior: "", observaciones: "" }
      ] },
    { nombre: "ANÁLISIS DE DATOS Y PROCESOS", clave: "04", activo: "SI", observaciones: "Clave 04 definida por el usuario para ADyP y sus subáreas", subareas: [
        { nombre: "ANÁLISIS DE DATOS", claveAnterior: "CI04", observaciones: "Clave 04 definida por el usuario para ADyP y sus subáreas" },
        { nombre: "CAJAS CHICAS", claveAnterior: "", observaciones: "Clave 04 definida por el usuario para ADyP y sus subáreas" },
        { nombre: "PROCESOS", claveAnterior: "CI02", observaciones: "Clave 04 definida por el usuario para ADyP y sus subáreas; Procesos pertenece a ADyP: cuerpo CI04; anterior CI02." }
      ] }
  ] },
  { nombre: "DIRECCIÓN GENERAL", clave: "DG", areas: [
    { nombre: "DIRECCION GENERAL", clave: "01", activo: "SI", observaciones: "Incorporada de lista maestra; clave original; Estatus origen: Activo | No figura en catálogo unificado adjunto; conservado sin eliminar.", subareas: [] }
  ] },
  { nombre: "FINANZAS", clave: "F", areas: [
    { nombre: "FINANZAS", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "JURÍDICO FINANZAS", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ANÁLISIS Y CONTROL FINANCIERO", clave: "03", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] }
  ] },
  { nombre: "FUNDACIÓN CIUDAD MADERAS", clave: "FCM", areas: [
    { nombre: "ADMINISTRACION DE OFICINAS (00)", clave: "00", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "FUNDACION CIUDAD MADERAS", clave: "00", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACION DE PAGOS", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "BECAS", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CASAS FCM", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "EDUCACION", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACION DE OFICINAS", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "VINCULACION", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "PSICOLOGIA", clave: "07", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CASAS LAMAT", clave: "08", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "PSICOPEDAGOGIA", clave: "09", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACION DE CASAS", clave: "10", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "VINCULACION JURIDICA Y DESARROLLO INTEGRAL", clave: "11", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "APOYOS MADERAS", clave: "12", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "PROGRAMAS EDUCATIVOS", clave: "13", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] },
    { nombre: "PSICOPEDAGOGICO", clave: "14", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] },
    { nombre: "ARTE Y CULTURA MADERAS", clave: "15", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] },
    { nombre: "FORMACION EDUCATIVA MADERAS", clave: "16", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] },
    { nombre: "IMPULSO SOCIAL MADERAS", clave: "17", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] },
    { nombre: "REFUGIO MADERAS", clave: "18", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] }
  ] },
  { nombre: "FUNDACION NASCAA", clave: "FN", areas: [
    { nombre: "ADMINISTRACION NASCAA", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CLINICA", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADOPCIONES", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "OPERATIVA", clave: "03", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "FUNDACION NYSSA", clave: "FNY", areas: [
    { nombre: "FUNDACION NYSSA", clave: "01", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "FUNDACIÓN YOLOTL", clave: "YOL", areas: [
    { nombre: "COMEDOR COMUNITARIO", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "FUNDACIÓN YOLOTL", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "PERSONAL FUERA DE NOMINA", clave: "03", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "JURÍDICO", clave: "JUR", areas: [
    { nombre: "JURÍDICO INTERNO", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "JURÍDICO EXTERNO", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "JURÍDICO MADERAS", clave: "03", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "MARKETING DIGITAL", clave: "MD", areas: [
    { nombre: "MARKETING DIGITAL", clave: "01", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "MERCADOTECNIA", clave: "M", areas: [
    { nombre: "DISEÑO", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MERCADOTECNIA", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ENLACE JURIDICO Y PAGOS", clave: "03", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] },
    { nombre: "VIAJES", clave: "04", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] }
  ] },
  { nombre: "POST VENTA", clave: "PV", areas: [
    { nombre: "POST VENTA", clave: "01", activo: "SI", observaciones: "", subareas: [
        { nombre: "ATENCIÓN AL CLIENTE PRESENCIAL", claveAnterior: "", observaciones: "" }
      ] },
    { nombre: "ADMINISTRACIÓN CONDOMINAL", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACIÓN DE OFICINA", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACIÓN DE PAGOS", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ATENCION AL CLIENTE", clave: "05", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] },
    { nombre: "CÓMITE TÉCNICO", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTROL DE CALIDAD", clave: "07", activo: "SI", observaciones: "Agregado de reporte homologación", subareas: [] },
    { nombre: "POST VENTA - AUXILIARES", clave: "08", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "VIGILANCIA", clave: "09", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CALL CENTER", clave: "10", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] },
    { nombre: "SPORT MADERAS", clave: "11", activo: "SI", observaciones: "Clave nueva: consecutivo posterior al máximo del departamento", subareas: [] }
  ] },
  { nombre: "POST VENTA ADMINISTRATIVO", clave: "PVA", areas: [
    { nombre: "ADMINISTRACION CONDOMINAL", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "COMITE TECNICO", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "POST VENTA", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CALL CENTER", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CALIDAD", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACION DE PAGOS", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "BASE DE DATOS", clave: "07", activo: "SI", observaciones: "Cuando se solicite la actualización de sus procesos, pasarán al área Post Venta, con Base de Datos como subárea y cuerpo PV01. Hasta entonces conserva PVA07.", subareas: [] },
    { nombre: "SAAC", clave: "08", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "POST VENTA OPERATIVO", clave: "PVO", areas: [
    { nombre: "MANTENIMIENTO", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "SEGURIDAD", clave: "02", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "PROYECTOS", clave: "P", areas: [
    { nombre: "TÉCNICO ARQUITECTONICO", clave: "01", activo: "SI", observaciones: "", subareas: [
        { nombre: "ARQUITECTURA DIGITAL", claveAnterior: "", observaciones: "" },
        { nombre: "OFICINAS", claveAnterior: "", observaciones: "" },
        { nombre: "PROYECTOS ARQUITECTONICOS OBRA CIVIL", claveAnterior: "", observaciones: "" }
      ] },
    { nombre: "GESTIÓN Y ADMINISTRACIÓN", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "PROYECTOS", clave: "03", activo: "SI", observaciones: "", subareas: [
        { nombre: "CASAS", claveAnterior: "", observaciones: "" }
      ] },
    { nombre: "TÉCNICO URBANO", clave: "04", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "SUBDIRECCIÓN GENERAL", clave: "SUB", areas: [
    { nombre: "SUBDIRECCIÓN GENERAL", clave: "01", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "TECNICA OOAM", clave: "TOO", areas: [
    { nombre: "INFRAESTRUCTURA", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "PROYECTOS Y SUPERVISION", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "OPERACION", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "DIRECCION TECNICA", clave: "04", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "TI", clave: "TI", areas: [
    { nombre: "TI", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "DESARROLLO", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "SOPORTE TI", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACIÓN DE OFICINA", clave: "04", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "UNNATI", clave: "U", areas: [
    { nombre: "UNNATI", clave: "01", activo: "SI", observaciones: "Incorporada de lista maestra; clave original; Estatus origen: Activo | No figura en catálogo unificado adjunto; conservado sin eliminar.", subareas: [] }
  ] }
];
