// Convierte los renglones del catálogo de Procesos («Catálogo para códigos») en la estructura que
// carga el sistema: departamentos → áreas → subáreas. Sin dependencias; probado en
// tests/catalogo.test.js.
//
// Reglas del archivo (encabezado de la hoja): el cuerpo del código es la nomenclatura del departamento
// + la clave del área a dos dígitos (CI + 04 = CI04), y toda subárea hereda la clave de su área.

const COLUMNAS = ['Departamento', 'Nomenclatura', 'Área', 'Clave de área', 'Subárea', 'Cuerpo del código', 'Nivel'];

// Textos de «Origen de clave» y «Observación» que no aportan nada al consultar el catálogo.
const SIN_VALOR = ['Clave validada contra catálogo unificado adjunto', 'Clave existente conservada', 'Estatus origen: Activo'];

const limpio = function (v) { return String(v === undefined || v === null ? '' : v).replace(/\s+/g, ' ').trim(); };
const comparable = function (v) { return limpio(v).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };

/** Une las notas de una fila (origen de la clave y observaciones) quitando lo que no aporta. */
function notas(celdas) {
  const vistas = [];
  celdas.map(limpio).filter(Boolean).forEach(function (c) {
    c.split(/;\s*/).map(limpio).forEach(function (parte) {
      if (parte && SIN_VALOR.indexOf(parte) === -1 && vistas.indexOf(parte) === -1) vistas.push(parte);
    });
  });
  return vistas.join('; ');
}

/**
 * renglones: la hoja completa (arreglos de textos). Devuelve { departamentos, avisos }.
 * Lanza error si el archivo rompe sus propias reglas (así no se carga un catálogo inconsistente).
 */
function catalogoDesdeRenglones(renglones) {
  const iEncabezado = renglones.findIndex(function (r) { return r && limpio(r[0]) === 'Departamento'; });
  if (iEncabezado === -1) throw new Error('No se encontró el renglón de encabezados («Departamento», «Nomenclatura»…).');
  const encabezados = renglones[iEncabezado].map(limpio);
  COLUMNAS.forEach(function (c, i) {
    if (encabezados[i] !== c) throw new Error('Se esperaba la columna «' + c + '» en la posición ' + (i + 1) + ' y llegó «' + encabezados[i] + '».');
  });

  const departamentos = [];
  const errores = [];
  const avisos = [];
  const buscarDepto = function (nombre) {
    return departamentos.filter(function (d) { return comparable(d.nombre) === comparable(nombre); })[0];
  };

  renglones.slice(iEncabezado + 1).forEach(function (r, i) {
    if (!r || !limpio(r[0])) return;
    const numero = iEncabezado + i + 2;
    const nivel = limpio(r[6]);
    const nomenclatura = limpio(r[1]).toUpperCase();
    const claveNum = Number(limpio(r[3]));
    if (!nomenclatura || !Number.isInteger(claveNum) || claveNum < 0 || claveNum > 99) {
      errores.push('Renglón ' + numero + ': nomenclatura o clave de área inválida (' + nomenclatura + ' / ' + limpio(r[3]) + ').');
      return;
    }
    const clave = String(claveNum).padStart(2, '0');
    if (limpio(r[5]).toUpperCase() !== nomenclatura + clave) {
      errores.push('Renglón ' + numero + ': el cuerpo del código «' + limpio(r[5]) + '» no es ' + nomenclatura + ' + ' + clave + '.');
      return;
    }

    let depto = buscarDepto(r[0]);
    if (!depto) {
      depto = { nombre: limpio(r[0]), clave: nomenclatura, areas: [] };
      departamentos.push(depto);
    } else if (depto.clave !== nomenclatura) {
      errores.push('Renglón ' + numero + ': ' + depto.nombre + ' trae dos nomenclaturas (' + depto.clave + ' y ' + nomenclatura + ').');
      return;
    }

    let nombreArea = limpio(r[2]);
    const nota = notas([r[7]].concat(r.slice(9)));
    if (nivel === 'Área') {
      const obsoleta = /^\(OBSOLETO\)\s*/i.test(nombreArea) || /Estatus origen: Inactivo/i.test(nota);
      nombreArea = nombreArea.replace(/^\(OBSOLETO\)\s*/i, '');
      depto.areas.push({ nombre: nombreArea, clave: clave, activo: obsoleta ? 'NO' : 'SI', observaciones: nota, subareas: [] });
    } else if (nivel === 'Subárea') {
      const area = depto.areas.filter(function (a) { return comparable(a.nombre) === comparable(nombreArea) && a.clave === clave; })[0];
      if (!area) {
        errores.push('Renglón ' + numero + ': la subárea «' + limpio(r[4]) + '» apunta al área «' + nombreArea + ' ' + clave + '», que no está antes en el archivo.');
        return;
      }
      area.subareas.push({ nombre: limpio(r[4]), claveAnterior: limpio(r[8]).toUpperCase(), observaciones: nota });
    } else {
      errores.push('Renglón ' + numero + ': nivel desconocido «' + nivel + '» (se espera Área o Subárea).');
    }
  });

  if (errores.length) throw new Error('El catálogo tiene errores:\n' + errores.join('\n'));

  // Lo que el archivo deja pendiente de decidir: se carga tal cual, pero se avisa.
  const porCuerpo = {};
  const porNomenclatura = {};
  departamentos.forEach(function (d) {
    (porNomenclatura[d.clave] = porNomenclatura[d.clave] || []).push(d.nombre);
    d.areas.forEach(function (a) { (porCuerpo[d.clave + a.clave] = porCuerpo[d.clave + a.clave] || []).push(d.nombre + ' / ' + a.nombre); });
  });
  Object.keys(porNomenclatura).forEach(function (n) {
    if (porNomenclatura[n].length > 1) avisos.push('La nomenclatura ' + n + ' la usan varios departamentos: ' + porNomenclatura[n].join(', ') + '.');
  });
  Object.keys(porCuerpo).forEach(function (c) {
    if (porCuerpo[c].length > 1) avisos.push('El cuerpo ' + c + ' lo comparten varias áreas: ' + porCuerpo[c].join(' · ') + '.');
  });
  return { departamentos: departamentos, avisos: avisos };
}

/** Los renglones «PENDIENTE…» de la hoja «Cambios de nombres»: lo que Procesos aún debe decidir. */
function pendientesDesdeRenglones(renglones) {
  return renglones.filter(function (r) { return r && /^PENDIENTE:/.test(limpio(r[0])); })
    .map(function (r) { return r.map(limpio).filter(Boolean).join(' | '); });
}

module.exports = { catalogoDesdeRenglones: catalogoDesdeRenglones, pendientesDesdeRenglones: pendientesDesdeRenglones };
