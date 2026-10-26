// Acceso a la hoja (src/utils/SheetUtils.gs) con una hoja de cálculo simulada que cuenta las consultas:
// la base se abre una vez por ejecución, los catálogos se leen una vez, lo demás siempre fresco, y
// escribir olvida lo recordado.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

function simulacion() {
  const cuenta = { abrir: 0, hojas: 0, lecturas: {}, escrituras: [] };
  const datos = {
    Usuarios: [['ID_USUARIO', 'NOMBRE', 'ACTIVO'], ['USR-1', 'Ana', 'SI'], ['USR-2', 'Paola', 'SI']],
    Solicitudes: [['ID_SOLICITUD', 'ESTADO', 'NOMBRE_DOCUMENTO', 'REVISION'], ['SOL-1', 'BORRADOR', 'Alta', '0']]
  };
  const hoja = function (nombre) {
    const v = datos[nombre];
    return {
      getDataRange: function () {
        cuenta.lecturas[nombre] = (cuenta.lecturas[nombre] || 0) + 1;
        return { getValues: function () { return v.map(function (r) { return r.slice(); }); } };
      },
      getLastColumn: function () { return v[0].length; },
      getLastRow: function () { return v.length; },
      getRange: function (fila, columna, filas, columnas) {
        return {
          getValues: function () { return v.slice(fila - 1, fila - 1 + filas).map(function (r) { return r.slice(columna - 1, columna - 1 + columnas); }); },
          setValues: function (valores) {
            cuenta.escrituras.push(nombre + ' ' + fila + ':' + columna + 'x' + columnas);
            valores.forEach(function (r, i) {
              v[fila - 1 + i] = v[fila - 1 + i] || [];
              r.forEach(function (x, j) { v[fila - 1 + i][columna - 1 + j] = x; });
            });
          }
        };
      },
      appendRow: function (r) { v.push(r); }
    };
  };
  const libro = { getSheetByName: function (n) { cuenta.hojas++; return datos[n] ? hoja(n) : null; } };
  const globales = {
    SpreadsheetApp: { getActiveSpreadsheet: function () { cuenta.abrir++; return libro; }, openById: function () { cuenta.abrir++; return libro; } },
    PropertiesService: { getScriptProperties: function () { return { getProperty: function () { return null; } }; } }
  };
  const gs = cargarGs(['src/config/Config.gs', 'src/utils/SheetUtils.gs'], globales);
  return { gs: gs, cuenta: cuenta, datos: datos };
}

test('la base se abre una vez y un catálogo se lee una sola vez por ejecución', function () {
  const s = simulacion();
  s.gs.leerTabla_('Usuarios');
  s.gs.leerTabla_('Usuarios');
  s.gs.leerTabla_('Solicitudes');
  assert.deepStrictEqual([s.cuenta.abrir, s.cuenta.hojas, s.cuenta.lecturas.Usuarios], [1, 2, 1]);
});

test('las hojas de operación se leen siempre de nuevo (pueden cambiar a media llamada)', function () {
  const s = simulacion();
  s.gs.leerTabla_('Solicitudes');
  s.datos.Solicitudes[1][1] = 'CONFIRMADO';
  assert.strictEqual(s.gs.leerTabla_('Solicitudes')[0].ESTADO, 'CONFIRMADO');
  assert.strictEqual(s.cuenta.lecturas.Solicitudes, 2);
});

test('lo recordado no se altera si quien lo usa modifica un renglón', function () {
  const s = simulacion();
  s.gs.leerTabla_('Usuarios')[0].NOMBRE = 'otro';
  assert.strictEqual(s.gs.leerTabla_('Usuarios')[0].NOMBRE, 'Ana');
});

test('escribir olvida lo recordado de esa hoja: la siguiente lectura trae el cambio', function () {
  const s = simulacion();
  const ana = s.gs.leerTabla_('Usuarios')[0];
  s.gs.actualizarFila_('Usuarios', ana._fila, { ACTIVO: 'NO' });
  assert.strictEqual(s.gs.leerTabla_('Usuarios')[0].ACTIVO, 'NO');
  s.gs.agregarFila_('Usuarios', { ID_USUARIO: 'USR-3', NOMBRE: 'Luis' });
  assert.deepStrictEqual(s.gs.leerTabla_('Usuarios').map(function (u) { return u.ID_USUARIO + ':' + u._fila; }), ['USR-1:2', 'USR-2:3', 'USR-3:4']);
  s.gs.olvidarTablas_();
  s.gs.leerTabla_('Usuarios');
  assert.strictEqual(s.cuenta.abrir, 2, 'olvidarTablas_ vuelve a abrir la base');
});

test('actualizar escribe las columnas vecinas juntas y no toca las demás', function () {
  const s = simulacion();
  s.gs.actualizarFila_('Solicitudes', 2, { REVISION: '1', ID_SOLICITUD: 'SOL-1', ESTADO: 'EN_REVISION' });
  assert.deepStrictEqual(s.cuenta.escrituras, ['Solicitudes 2:1x2', 'Solicitudes 2:4x1']);
  assert.deepStrictEqual(s.datos.Solicitudes[1], ['SOL-1', 'EN_REVISION', 'Alta', '1']);
  assert.throws(function () { s.gs.actualizarFila_('Solicitudes', 2, { NO_EXISTE: 1 }); }, /no tiene la columna NO_EXISTE/);
});
