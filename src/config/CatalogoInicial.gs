/**
 * CATÁLOGO INICIAL DE DEPARTAMENTOS, ÁREAS Y SUBÁREAS — GENERADO, NO SE EDITA A MANO.
 *
 * Sale de docs/insumos/catalogo-departamentos-areas.xlsx (hoja «lista_maestra_area») con
 * `npm run catalogo` (tools/catalogo/convertir-catalogo.js). importarCatalogoInicial() lo carga a la
 * base sin borrar ni cambiar lo que ya exista. Después, el catálogo se administra en la base.
 *
 * 27 departamentos · 147 áreas · 28 subáreas.
 */
const CATALOGO_INICIAL = [
  { nombre: "ADMINISTRACION", clave: "A", areas: [
    { nombre: "ADMINISTRACION", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTROL DE ARCHIVO", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CAJAS", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACION DE PAGOS", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CUENTAS POR PAGAR", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "FACTURACION", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "RECEPCION DE ADMINISTRACION", clave: "07", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "ADMINISTRACION DE OFICINAS", clave: "AO", areas: [
    { nombre: "ADMINISTRACION DE OFICINAS", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACION DE PAGOS", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MANTENIMIENTO DE OFICINAS", clave: "03", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "ADMINISTRACION OOAM", clave: "AOO", areas: [
    { nombre: "ADMINISTRACION OOAM", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACION DE CONSUMOS", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "COBRANZA OOAM", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONCESIONES Y FACTIBILIDADES", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "FACTURACION OOAM", clave: "05", activo: "SI", observaciones: "", subareas: [
        { nombre: "DOMICILIACIONES", claveAnterior: "", observaciones: "" },
        { nombre: "ESTADOS DE CUENTA", claveAnterior: "", observaciones: "" },
        { nombre: "DEVOLUCIONES Y TRASPASOS", claveAnterior: "", observaciones: "" }
      ] },
    { nombre: "SOLUCION AL CLIENTE OOAM", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "SUMINISTROS, CORTES Y RECONEXIONES", clave: "07", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "ARQUITECTURA DEL PAISAJE", clave: "AP", areas: [
    { nombre: "ARQUITECTURA DEL PAISAJE", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACION ADP", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONSERVACION AMBIENTAL ADP", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CREACIONES ADP", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MANTENIMIENTO", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MANTENIMIENTO ADP", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "PROYECTOS ADP", clave: "07", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "BIOFISICA APLICADA", clave: "SC", areas: [
    { nombre: "BIOFISICA APLICADA", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "BIOTECNOLOGIAS", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "BIOESTRATEGIAS", clave: "03", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "CAPITAL HUMANO", clave: "CH", areas: [
    { nombre: "ATRACCION DE TALENTO", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CAPACITACION Y DESARROLLO DE PERSONAL", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "COMUNICACION", clave: "03", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] },
    { nombre: "DESARROLLO ORGANIZACIONAL", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "DIRECCION", clave: "07", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] },
    { nombre: "RELACIONES LABORALES", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "SUBDIRECCION", clave: "06", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] },
    { nombre: "ADMINISTRACION DE OFICINAS", clave: "08", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] },
    { nombre: "SUBDIRECCION", clave: "09", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CAPITAL HUMANO", clave: "10", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "HABITOS SALUDABLES", clave: "11", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] },
    { nombre: "HAPPINESS ORGANIZACIONAL", clave: "12", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "CIUDAD MADERAS", clave: "CM", areas: [
    { nombre: "CIUDAD MADERAS", clave: "01", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "COBRANZA", clave: "CO", areas: [
    { nombre: "COBRANZA", clave: "01", activo: "SI", observaciones: "", subareas: [
        { nombre: "ATENCIÓN AL CLIENTE", claveAnterior: "", observaciones: "" },
        { nombre: "COBRANZA JURÍDICO", claveAnterior: "", observaciones: "" }
      ] },
    { nombre: "LINEAS TELEFONICAS", clave: "08", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] }
  ] },
  { nombre: "COBRANZA GPH", clave: "GPH", areas: [
    { nombre: "COBRANZA GPH", clave: "00", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "FLOTILLAS", clave: "03", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] },
    { nombre: "COBRANZA Y SERVICIO AL CLIENTE", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTROL ADMINISTRATIVO", clave: "02", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "COMERCIALIZACION", clave: "COM", areas: [
    { nombre: "COMERCIALIZACION", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CIUDAD MADERAS CASAS - TERRENOS", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "FACTOR HUMANO COMERCIAL", clave: "03", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] },
    { nombre: "RECLUTAMIENTO Y CAPACITACIÓN COMERCIAL", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CIUDAD MADERAS CASAS PREMIUM", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MERCADOTECNIA COMERCIAL", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "PROYECTOS ESPECIALES", clave: "08", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "COMPRAS", clave: "CMP", areas: [
    { nombre: "SUMINISTROS", clave: "02", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] },
    { nombre: "VIAJES", clave: "03", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] },
    { nombre: "COMPRAS", clave: "00", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] },
    { nombre: "ADMINISTRACION DE COMPRAS", clave: "01", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] },
    { nombre: "COMPRAS - BAJIO", clave: "05", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] },
    { nombre: "COMPRAS - SUR", clave: "06", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] }
  ] },
  { nombre: "COMUNICACIÓN", clave: "CMC", areas: [
    { nombre: "COMUNICACIÓN", clave: "00", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "COMUNICACIÓN INTERNA", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "AUDIOVISUAL", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTENIDOS", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "DISEÑO", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "INTELIGENCIA", clave: "05", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "CONSTRUCCION", clave: "CON", areas: [
    { nombre: "ADMINISTRACION DE CONSTRUCCION", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "COSTOS Y PRESUPUESTOS", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ELECTRICIDAD", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "LABORATORIO DE CONTROL DE CALIDAD", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MANTENIMIENTO MAQUINARIA", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MANTENIMIENTO", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "PRODUCCION", clave: "07", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MAQUINARIA", clave: "08", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MAQUINARIA ESPECIALIZADA", clave: "09", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "OBRA CIVIL", clave: "10", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "URBANIZACION", clave: "11", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "TÉCNICA OOAM", clave: "12", activo: "SI", observaciones: "", subareas: [
        { nombre: "SUBDIRECCION TECNICA OOAM", claveAnterior: "", observaciones: "" },
        { nombre: "OOAM - INFRAESTRUCTURA", claveAnterior: "", observaciones: "" },
        { nombre: "OOAM - OBRA CIVIL", claveAnterior: "", observaciones: "" },
        { nombre: "OOAM - OPERACIONES Y SANEAMIENTO", claveAnterior: "", observaciones: "" },
        { nombre: "OOAM - PROYECTOS Y SUPERVISION", claveAnterior: "", observaciones: "" },
        { nombre: "OPERACION E INNOVACION DE AGUA POTABLE", claveAnterior: "", observaciones: "" }
      ] }
  ] },
  { nombre: "CONTABILIDAD", clave: "C", areas: [
    { nombre: "CONTABILIDAD", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "NOMINAS", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "EGRESOS", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "IMPUESTOS", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "INGRESOS", clave: "05", activo: "SI", observaciones: "", subareas: [
        { nombre: "COSTOS", claveAnterior: "", observaciones: "" }
      ] },
    { nombre: "CASAS", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "OOAM - CONTABILIDAD", clave: "07", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "REESTRUCTURAS", clave: "08", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "MEMORIAL MADERAS", clave: "09", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "CONTRALORIA", clave: "CLA", areas: [
    { nombre: "CONTRALORIA", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTRALORIA CORPORATIVA", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTRATOS", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CASAS", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "COMISIONES", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "TRAMITES POST VENTA ( CONTRALORIA POST VENTA)", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "TRAMITES ESPECIALES (UPGRADE)", clave: "07", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "CONTRATACION Y TITULACION", clave: "CT", areas: [
    { nombre: "CONTRATACION", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "TITULACION", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTRATACION Y TITULACION", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTRATACIÓN Y TITULACIÓN - CASAS PREMIUM", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CONTRATACIÓN Y TITULACIÓN - MEMORIAL MDS", clave: "05", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "CONTROL INTERNO", clave: "CI", areas: [
    { nombre: "CONTROL INTERNO", clave: "01", activo: "SI", observaciones: "", subareas: [
        { nombre: "INSPECCIONES CELULARES", claveAnterior: "", observaciones: "" },
        { nombre: "INSPECCCIONES VEHICULARES", claveAnterior: "", observaciones: "" },
        { nombre: "GESTORÍA VEHICULAR", claveAnterior: "", observaciones: "" },
        { nombre: "ADQUISIÓN VEHICULAR", claveAnterior: "", observaciones: "" },
        { nombre: "LINEAS TELEFONICAS", claveAnterior: "", observaciones: "" }
      ] },
    { nombre: "PROCESOS", clave: "02", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] },
    { nombre: "AUDITORÍA Y CALIDAD", clave: "03", activo: "SI", observaciones: "", subareas: [
        { nombre: "AUDITORIA", claveAnterior: "", observaciones: "" },
        { nombre: "CALIDAD", claveAnterior: "", observaciones: "" }
      ] },
    { nombre: "ANÁLISIS DE DATOS Y PROCESOS", clave: "04", activo: "SI", observaciones: "", subareas: [
        { nombre: "ANÁLISIS DE DATOS", claveAnterior: "", observaciones: "" },
        { nombre: "PROCESOS", claveAnterior: "", observaciones: "" },
        { nombre: "CAJAS CHICAS", claveAnterior: "", observaciones: "" }
      ] },
    { nombre: "KAIZEN", clave: "05", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] },
    { nombre: "SERVICIOS VEHICULARES", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "GESTIÓN VEHICULAR", clave: "07", activo: "NO", observaciones: "Marcada «(OBSOLETO)» en la lista maestra.", subareas: [] }
  ] },
  { nombre: "FINANZAS", clave: "F", areas: [
    { nombre: "FINANZAS", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "JURIDICO FINANZAS", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ANÁLISIS Y CONTROL FINANCIERO", clave: "03", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "FUNDACION CIUDAD MADERAS", clave: "FCM", areas: [
    { nombre: "FUNDACION CIUDAD MADERAS", clave: "00", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACIÓN DE PAGOS", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "BECAS", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ARTE Y CULTURA MADERAS", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "EDUCACIÓN", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "FORMACIÓN EDUCATIVA MADERAS", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "VINCULACIÓN", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "IMPULSO SOCIAL MADERAS", clave: "07", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CASAS LAMAT", clave: "08", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "REFUGIO MADERAS", clave: "09", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "VINCULACIÓN JURÍDICA Y DESARROLLO INTEGRAL", clave: "10", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "FUNDACION NYSSA", clave: "FNY", areas: [
    { nombre: "FUNDACION NYSSA", clave: "01", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "FUNDACION YOLOTL", clave: "YOL", areas: [
    { nombre: "COMEDOR COMUNITARIO", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "FUNDACION YOLOTL", clave: "02", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "JURIDICO", clave: "JUR", areas: [
    { nombre: "JURIDICO INTERNO", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "JURIDICO EXTERNO", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "JURIDICO MADERAS", clave: "03", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "MERCADOTECNIA", clave: "M", areas: [
    { nombre: "MERCADOTECNIA", clave: "02", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "POST VENTA", clave: "PV", areas: [
    { nombre: "POST VENTA", clave: "01", activo: "SI", observaciones: "", subareas: [
        { nombre: "BASE DE DATOS", claveAnterior: "", observaciones: "" },
        { nombre: "ATENCIÓN AL CLIENTE PRESENCIAL", claveAnterior: "", observaciones: "" }
      ] },
    { nombre: "ADMINISTRACIÓN CONDOMINAL", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACIÓN DE OFICINA", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACIÓN DE PAGOS", clave: "04", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "CALL CENTER", clave: "05", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "COMITÉ TÉCNICO", clave: "06", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "SPORT MADERAS", clave: "07", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "POST VENTA - AUXILIARES", clave: "08", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "VIGILANCIA", clave: "09", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "PROYECTOS", clave: "P", areas: [
    { nombre: "GESTIÓN Y ADMINISTRACIÓN", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "PROYECTOS", clave: "02", activo: "SI", observaciones: "", subareas: [
        { nombre: "CASAS", claveAnterior: "", observaciones: "" }
      ] },
    { nombre: "TÉCNICO ARQUITECTONICO", clave: "03", activo: "SI", observaciones: "", subareas: [
        { nombre: "ARQUITECTURA DIGITAL", claveAnterior: "", observaciones: "" },
        { nombre: "OFICINAS", claveAnterior: "", observaciones: "" },
        { nombre: "PROYECTOS ARQUITECTONICOS OBRA CIVIL", claveAnterior: "", observaciones: "" }
      ] },
    { nombre: "TÉCNICO URBANO", clave: "04", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "TECNICA OOAM", clave: "TOO", areas: [
    { nombre: "INFRAESTRUCTURA", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "OPERACION", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "PROYECTOS Y SUPERVISION", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "DIRECCION TECNICA", clave: "04", activo: "SI", observaciones: "", subareas: [] }
  ] },
  { nombre: "TI", clave: "TI", areas: [
    { nombre: "DESARROLLO", clave: "02", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "SOPORTE TI", clave: "03", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "TI", clave: "01", activo: "SI", observaciones: "", subareas: [] },
    { nombre: "ADMINISTRACION DE OFICINAS", clave: "04", activo: "SI", observaciones: "", subareas: [] }
  ] }
];
