// Convierte la lista maestra de Procesos («lista_maestra_area», 21/10/2026) en la estructura que carga el
// sistema: departamentos → áreas → subáreas. Sin dependencias; probado en tests/catalogo.test.js.
//
// El archivo trae un renglón por área (o por subárea, repitiendo su área):
//   DEPARTAMENTO · CODIGO_DEPARTAMENTO · AREA · CODIGO_AREA · SUB AREA
// El cuerpo del código es el código del departamento + la clave del área a dos dígitos (CI + 04 = CI04);
// toda subárea hereda la clave de su área. Un área con «(OBSOLETO)» queda dada de baja.

// Encabezados que se buscan (sin importar mayúsculas, acentos, espacios ni guiones bajos).
const COLUMNAS = { departamento: 'DEPARTAMENTO', nomenclatura: 'CODIGO DEPARTAMENTO', area: 'AREA', clave: 'CODIGO AREA', subarea: 'SUB AREA' };
const OBSOLETO = /^\(\s*OBSOLETO\s*\)\s*/i;

const limpio = function (v) { return String(v === undefined || v === null ? '' : v).replace(/\s+/g, ' ').trim(); };
const comparable = function (v) { return limpio(v).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
const encabezado = function (v) { return comparable(String(v || '').replace(/_/g, ' ')); };

/**
 * renglones: la hoja completa (arreglos de textos). Devuelve { departamentos, avisos }.
 * Lanza error si el archivo rompe sus propias reglas (así no se carga un catálogo inconsistente).
 */
function catalogoDesdeRenglones(renglones) {
  const iEncabezado = renglones.findIndex(function (r) {
    const e = (r || []).map(encabezado);
    return e.indexOf(COLUMNAS.departamento) !== -1 && e.indexOf(COLUMNAS.nomenclatura) !== -1;
  });
  if (iEncabezado === -1) throw new Error('No se encontró el renglón de encabezados (DEPARTAMENTO, CODIGO_DEPARTAMENTO, AREA, CODIGO_AREA, SUB AREA).');
  const enc = renglones[iEncabezado].map(encabezado);
  const col = {};
  Object.keys(COLUMNAS).forEach(function (k) {
    col[k] = enc.indexOf(COLUMNAS[k]);
    if (col[k] === -1) throw new Error('Falta la columna «' + COLUMNAS[k] + '».');
  });

  const departamentos = [];
  const errores = [];
  const avisos = [];
  const buscar = function (lista, nombre) { return lista.filter(function (x) { return comparable(x.nombre) === comparable(nombre); })[0]; };

  renglones.slice(iEncabezado + 1).forEach(function (r, i) {
    const numero = iEncabezado + i + 2;
    const nombreDepto = limpio(r && r[col.departamento]);
    if (!nombreDepto) return;
    const nomenclatura = limpio(r[col.nomenclatura]).toUpperCase();
    const textoClave = limpio(r[col.clave]);
    const claveNum = Number(textoClave);
    let nombreArea = limpio(r[col.area]);
    if (!/^[A-Z0-9]+$/.test(nomenclatura)) { errores.push('Renglón ' + numero + ': código de departamento inválido «' + nomenclatura + '».'); return; }
    if (!textoClave || !Number.isInteger(claveNum) || claveNum < 0 || claveNum > 99) {
      errores.push('Renglón ' + numero + ': clave de área inválida «' + textoClave + '».');
      return;
    }
    if (!nombreArea) { errores.push('Renglón ' + numero + ': falta el nombre del área.'); return; }
    const clave = String(claveNum).padStart(2, '0');
    if (textoClave !== clave) avisos.push('Renglón ' + numero + ': ' + nombreDepto + ' / ' + nombreArea + ' trae la clave «' + textoClave + '»; se tomó como ' + clave + '.');

    let depto = buscar(departamentos, nombreDepto);
    if (!depto) {
      depto = { nombre: nombreDepto, clave: nomenclatura, areas: [] };
      departamentos.push(depto);
    } else if (depto.clave !== nomenclatura) {
      errores.push('Renglón ' + numero + ': ' + depto.nombre + ' trae dos códigos (' + depto.clave + ' y ' + nomenclatura + ').');
      return;
    }

    const obsoleta = OBSOLETO.test(nombreArea);
    nombreArea = nombreArea.replace(OBSOLETO, '');
    let area = depto.areas.filter(function (a) { return a.clave === clave; })[0];
    if (area && comparable(area.nombre) !== comparable(nombreArea)) {
      errores.push('Renglón ' + numero + ': la clave ' + nomenclatura + clave + ' ya es de «' + area.nombre + '» y aquí dice «' + nombreArea + '».');
      return;
    }
    if (!area) {
      area = { nombre: nombreArea, clave: clave, activo: obsoleta ? 'NO' : 'SI',
        observaciones: obsoleta ? 'Marcada «(OBSOLETO)» en la lista maestra.' : '', subareas: [] };
      depto.areas.push(area);
    }

    const nombreSub = limpio(r[col.subarea]);
    if (nombreSub && !buscar(area.subareas, nombreSub)) area.subareas.push({ nombre: nombreSub, claveAnterior: '', observaciones: '' });
  });

  if (errores.length) throw new Error('El catálogo tiene errores:\n' + errores.join('\n'));

  // Lo que el archivo deja para que Procesos lo decida: se carga tal cual, pero se avisa.
  const porNomenclatura = {};
  departamentos.forEach(function (d) {
    (porNomenclatura[d.clave] = porNomenclatura[d.clave] || []).push(d.nombre);
    const porNombre = {};
    d.areas.forEach(function (a) { (porNombre[comparable(a.nombre)] = porNombre[comparable(a.nombre)] || []).push(a); });
    Object.keys(porNombre).forEach(function (n) {
      const activas = porNombre[n].filter(function (a) { return a.activo === 'SI'; });
      if (activas.length > 1) avisos.push(d.nombre + ': el área ' + activas[0].nombre + ' está activa con dos claves (' + activas.map(function (a) { return d.clave + a.clave; }).join(' y ') + ').');
    });
  });
  Object.keys(porNomenclatura).forEach(function (n) {
    if (porNomenclatura[n].length > 1) avisos.push('El código ' + n + ' lo usan varios departamentos: ' + porNomenclatura[n].join(', ') + '.');
  });
  return { departamentos: departamentos, avisos: avisos };
}

/** La hoja que trae el catálogo: la primera con el renglón de encabezados. */
function hojaDelCatalogo(hojas) {
  return Object.keys(hojas).filter(function (n) {
    return (hojas[n] || []).some(function (r) { return (r || []).map(encabezado).indexOf(COLUMNAS.nomenclatura) !== -1; });
  })[0];
}

module.exports = { catalogoDesdeRenglones: catalogoDesdeRenglones, hojaDelCatalogo: hojaDelCatalogo };
