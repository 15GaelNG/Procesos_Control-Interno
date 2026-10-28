// Acceso a la hoja (src/utils/SheetUtils.gs) con una hoja de cálculo simulada que cuenta las consultas:
// la base se abre una vez por ejecución, los catálogos se leen una vez y se recuerdan entre llamadas
// (caché del script), lo demás siempre fresco, y escribir o editar a mano olvida lo recordado.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

function simulacion(cacheCompartida) {
  const cuenta = { abrir: 0, hojas: 0, lecturas: {}, escrituras: [] };
  const cache = cacheCompartida || {};
  const datos = {
    Usuarios: [['ID_USUARIO', 'NOMBRE', 'ACTIVO', 'FECHA_ALTA'], ['USR-1', 'Ana', 'SI', new Date(2026, 9, 1)], ['USR-2', 'Paola', 'SI', '']],
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
    console: { log: function () {}, warn: console.warn, error: console.error },
    SpreadsheetApp: { getActiveSpreadsheet: function () { cuenta.abrir++; return libro; }, openById: function () { cuenta.abrir++; return libro; } },
    PropertiesService: { getScriptProperties: function () { return { getProperty: function () { return null; } }; } },
    CacheService: { getScriptCache: function () { return {
      get: function (k) { return cache[k] || null; },
      put: function (k, v) { cache[k] = v; },
      remove: function (k) { delete cache[k]; },
      removeAll: function (ks) { ks.forEach(function (k) { delete cache[k]; }); }
    }; } }
  };
  const gs = cargarGs(['src/config/Config.gs', 'src/utils/SheetUtils.gs', 'src/Disparadores.gs'], globales);
  return { gs: gs, cuenta: cuenta, datos: datos, cache: cache };
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
  s.gs.agregarFila_('Usuarios', { ID_USUARIO: 'USR-3', NOMBRE: 'Luis', FECHA_ALTA: '' });
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

// ─────────────────────────────── Entre llamadas (caché del script) ───────────────────────────────

test('la siguiente llamada toma los catálogos de la caché, sin abrir la base, y las fechas siguen siendo fechas', function () {
  const cache = {};
  simulacion(cache).gs.leerTabla_('Usuarios');
  const otra = simulacion(cache);
  const u = otra.gs.leerTabla_('Usuarios');
  assert.deepStrictEqual([otra.cuenta.abrir, otra.cuenta.lecturas.Usuarios], [0, undefined]);
  assert.strictEqual(Object.prototype.toString.call(u[0].FECHA_ALTA), '[object Date]');
  assert.strictEqual(u[0].FECHA_ALTA.getDate(), 1);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(u.map(function (x) { return x.NOMBRE + ':' + x._fila; }))), ['Ana:2', 'Paola:3']);
  assert.ok(!cache['tabla-Solicitudes'], 'las hojas de operación no se guardan en la caché');
});

test('escribir, editar a mano o leer fresco olvidan la caché de esa hoja', function () {
  const cache = {};
  const s = simulacion(cache);
  s.gs.leerTabla_('Usuarios');
  s.gs.actualizarFila_('Usuarios', 2, { ACTIVO: 'NO' });
  assert.ok(!cache['tabla-Usuarios'], 'escribir');
  s.gs.leerTabla_('Usuarios');
  s.gs.onEdit({ range: { getSheet: function () { return { getName: function () { return 'Usuarios'; } }; } } });
  assert.ok(!cache['tabla-Usuarios'], 'editar a mano');
  s.gs.onEdit({});
  s.gs.onEdit(undefined);
  s.gs.leerTabla_('Usuarios');
  const antes = s.cuenta.lecturas.Usuarios;
  assert.strictEqual(s.gs.leerTablaFresca_('Usuarios')[0].ACTIVO, 'NO');
  assert.strictEqual(s.cuenta.lecturas.Usuarios, antes + 1, 'leer fresco va a la hoja');
});

