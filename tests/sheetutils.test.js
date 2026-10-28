// Acceso a la hoja (src/utils/SheetUtils.gs) con una hoja de cálculo simulada que cuenta las consultas:
// la base se abre una vez por ejecución, cada hoja se lee una vez y lo escrito se aplica a lo recordado,
// los catálogos se recuerdan entre llamadas (caché del script, en una sola consulta), y bajo el candado
// la primera lectura es fresca, agregar renglones no choca y al soltarlo se confirman las escrituras.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

function simulacion(cacheCompartida, libres) {
  const cuenta = { abrir: 0, hojas: 0, lecturas: {}, escrituras: [], cache: 0, candado: [], flush: 0 };
  const cache = cacheCompartida || {};
  const datos = {
    Usuarios: [['ID_USUARIO', 'NOMBRE', 'ACTIVO', 'FECHA_ALTA'], ['USR-1', 'Ana', 'SI', new Date(2026, 9, 1)], ['USR-2', 'Paola', 'SI', '']],
    Areas: [['ID_AREA', 'NOMBRE'], ['ARE-1', 'Pagos']],
    Solicitudes: [['ID_SOLICITUD', 'ESTADO', 'NOMBRE_DOCUMENTO', 'REVISION'], ['SOL-1', 'BORRADOR', 'Alta', '0']],
    Actividades: [['ID_ACTIVIDAD', 'ID_SOLICITUD', 'TEXTO_ORIGINAL'], ['ACT-1', 'SOL-1', 'Recibe']]
  };
  const maximo = {};
  Object.keys(datos).forEach(function (n) { maximo[n] = datos[n].length + (libres === undefined ? 100 : libres); });
  const hoja = function (nombre) {
    const v = datos[nombre];
    return {
      getDataRange: function () {
        cuenta.lecturas[nombre] = (cuenta.lecturas[nombre] || 0) + 1;
        return { getValues: function () { return v.map(function (r) { return r.slice(); }); } };
      },
      getLastColumn: function () { return v[0].length; },
      getLastRow: function () { return v.length; },
      getMaxRows: function () { return maximo[nombre]; },
      insertRowsAfter: function (despues, n) { cuenta.escrituras.push(nombre + ' +' + n + ' renglones'); maximo[nombre] += n; },
      getRange: function (fila, columna, filas, columnas) {
        return {
          getValues: function () { return v.slice(fila - 1, fila - 1 + filas).map(function (r) { return r.slice(columna - 1, columna - 1 + columnas); }); },
          setValues: function (valores) {
            if (fila - 1 + valores.length > maximo[nombre]) throw new Error('Fuera de la hoja');
            cuenta.escrituras.push(nombre + ' ' + fila + ':' + columna + 'x' + columnas);
            valores.forEach(function (r, i) {
              v[fila - 1 + i] = v[fila - 1 + i] || [];
              r.forEach(function (x, j) { v[fila - 1 + i][columna - 1 + j] = x; });
            });
          }
        };
      },
      appendRow: function (r) { v.push(r); maximo[nombre] = Math.max(maximo[nombre], v.length); }
    };
  };
  const libro = { getSheetByName: function (n) { cuenta.hojas++; return datos[n] ? hoja(n) : null; } };
  const globales = {
    console: { log: function () {}, warn: console.warn, error: console.error },
    SpreadsheetApp: { getActiveSpreadsheet: function () { cuenta.abrir++; return libro; }, openById: function () { cuenta.abrir++; return libro; },
      flush: function () { cuenta.flush++; } },
    PropertiesService: { getScriptProperties: function () { return { getProperty: function () { return null; } }; } },
    LockService: { getScriptLock: function () { return {
      waitLock: function () { cuenta.candado.push('toma'); },
      releaseLock: function () { cuenta.candado.push('suelta'); }
    }; } },
    CacheService: { getScriptCache: function () { return {
      get: function (k) { cuenta.cache++; return cache[k] || null; },
      getAll: function (ks) {
        cuenta.cache++;
        const r = {};
        ks.forEach(function (k) { if (cache[k]) r[k] = cache[k]; });
        return r;
      },
      put: function (k, v) { cache[k] = v; },
      remove: function (k) { delete cache[k]; },
      removeAll: function (ks) { ks.forEach(function (k) { delete cache[k]; }); }
    }; } }
  };
  const gs = cargarGs(['src/config/Config.gs', 'src/utils/SheetUtils.gs', 'src/Disparadores.gs'], globales);
  return { gs: gs, cuenta: cuenta, datos: datos, cache: cache };
}

const plano = function (x) { return JSON.parse(JSON.stringify(x)); };

test('la base se abre una vez y cada hoja se lee una sola vez por ejecución', function () {
  const s = simulacion();
  s.gs.leerTabla_('Usuarios');
  s.gs.leerTabla_('Usuarios');
  s.gs.leerTabla_('Solicitudes');
  s.gs.leerTabla_('Solicitudes');
  assert.deepStrictEqual([s.cuenta.abrir, s.cuenta.hojas, s.cuenta.lecturas.Usuarios, s.cuenta.lecturas.Solicitudes], [1, 2, 1, 1]);
});

test('lo recordado no se altera si quien lo usa modifica un renglón', function () {
  const s = simulacion();
  s.gs.leerTabla_('Usuarios')[0].NOMBRE = 'otro';
  s.gs.leerTabla_('Solicitudes')[0].ESTADO = 'otro';
  assert.strictEqual(s.gs.leerTabla_('Usuarios')[0].NOMBRE, 'Ana');
  assert.strictEqual(s.gs.leerTabla_('Solicitudes')[0].ESTADO, 'BORRADOR');
});

test('lo que se escribe se aplica a lo recordado: la pantalla de después no vuelve a leer', function () {
  const s = simulacion();
  s.gs.leerTabla_('Solicitudes');
  s.gs.leerTabla_('Actividades');
  s.gs.actualizarFila_('Solicitudes', 2, { ESTADO: 'CONFIRMADO' });
  const primera = s.gs.agregarFilas_('Actividades', [{ ID_ACTIVIDAD: 'ACT-2', ID_SOLICITUD: 'SOL-1', TEXTO_ORIGINAL: 'Revisa' }, { ID_ACTIVIDAD: 'ACT-3' }]);
  assert.strictEqual(primera, 3);
  assert.strictEqual(s.gs.leerTabla_('Solicitudes')[0].ESTADO, 'CONFIRMADO');
  assert.deepStrictEqual(plano(s.gs.leerTabla_('Actividades').map(function (a) { return [a.ID_ACTIVIDAD, a._fila, a.ID_SOLICITUD]; })),
    [['ACT-1', 2, 'SOL-1'], ['ACT-2', 3, 'SOL-1'], ['ACT-3', 4, '']]);
  assert.deepStrictEqual([s.cuenta.lecturas.Solicitudes, s.cuenta.lecturas.Actividades], [1, 1]);
  assert.deepStrictEqual(s.datos.Actividades[3], ['ACT-3', '', ''], 'las columnas que no vienen quedan vacías');
});

test('agregar un renglón con appendRow olvida lo recordado de esa hoja (la siguiente lectura lo trae)', function () {
  const s = simulacion();
  const ana = s.gs.leerTabla_('Usuarios')[0];
  s.gs.actualizarFila_('Usuarios', ana._fila, { ACTIVO: 'NO' });
  assert.strictEqual(s.gs.leerTabla_('Usuarios')[0].ACTIVO, 'NO');
  s.gs.agregarFila_('Usuarios', { ID_USUARIO: 'USR-3', NOMBRE: 'Luis', FECHA_ALTA: '' });
  assert.deepStrictEqual(plano(s.gs.leerTabla_('Usuarios').map(function (u) { return u.ID_USUARIO + ':' + u._fila; })), ['USR-1:2', 'USR-2:3', 'USR-3:4']);
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

// ─────────────────────────────── Candado ───────────────────────────────

test('bajo el candado la primera lectura de una hoja de operación es fresca; los catálogos no', function () {
  const s = simulacion();
  s.gs.leerTabla_('Solicitudes');
  s.gs.leerTabla_('Usuarios');
  s.datos.Solicitudes[1][1] = 'EN_REVISION';   // otra persona la cambió mientras tanto
  const estado = s.gs.conCandado_(1000, function () {
    const primera = s.gs.leerTabla_('Solicitudes')[0].ESTADO;
    s.gs.leerTabla_('Solicitudes');
    s.gs.leerTabla_('Usuarios');
    return primera;
  });
  assert.strictEqual(estado, 'EN_REVISION');
  assert.deepStrictEqual([s.cuenta.lecturas.Solicitudes, s.cuenta.lecturas.Usuarios], [2, 1]);
});

test('el candado anidado no se suelta a media función y al soltarlo se confirman las escrituras', function () {
  const s = simulacion();
  s.gs.conCandado_(1000, function () {
    s.gs.conCandado_(1000, function () { s.gs.actualizarFila_('Solicitudes', 2, { ESTADO: 'X' }); });
    assert.deepStrictEqual(s.cuenta.candado, ['toma'], 'el de adentro no lo suelta');
    s.gs.agregarFilas_('Actividades', [{ ID_ACTIVIDAD: 'ACT-2' }]);
    assert.strictEqual(s.cuenta.flush, 0);
  });
  assert.deepStrictEqual(s.cuenta.candado, ['toma', 'suelta']);
  assert.strictEqual(s.cuenta.flush, 1);
  s.gs.conCandado_(1000, function () { s.gs.leerTabla_('Solicitudes'); });
  assert.strictEqual(s.cuenta.flush, 1, 'sin escrituras pendientes no hay nada que confirmar');
  assert.throws(function () { s.gs.conCandado_(1000, function () { throw new Error('falló'); }); }, /falló/);
  assert.deepStrictEqual(s.cuenta.candado.slice(-2), ['toma', 'suelta'], 'se suelta aunque falle');
});

test('agregar renglones toma el candado y le agrega renglones a la hoja si ya está llena', function () {
  const s = simulacion(null, 0);
  s.gs.agregarFilas_('Actividades', [{ ID_ACTIVIDAD: 'ACT-2' }, { ID_ACTIVIDAD: 'ACT-3' }]);
  assert.deepStrictEqual(s.cuenta.escrituras, ['Actividades +2 renglones', 'Actividades 3:1x3']);
  assert.deepStrictEqual(s.cuenta.candado, ['toma', 'suelta']);
  assert.strictEqual(s.cuenta.flush, 1);
  assert.strictEqual(s.gs.agregarFilas_('Actividades', []), 0);
});

// ─────────────────────────────── Entre llamadas (caché del script) ───────────────────────────────

test('la siguiente llamada toma los catálogos de la caché en una sola consulta, sin abrir la base', function () {
  const cache = {};
  const primera = simulacion(cache);
  primera.gs.leerTabla_('Usuarios');
  primera.gs.leerTabla_('Areas');
  const otra = simulacion(cache);
  const u = otra.gs.leerTabla_('Usuarios');
  otra.gs.leerTabla_('Areas');
  assert.deepStrictEqual([otra.cuenta.abrir, otra.cuenta.lecturas.Usuarios, otra.cuenta.lecturas.Areas, otra.cuenta.cache], [0, undefined, undefined, 1]);
  assert.strictEqual(Object.prototype.toString.call(u[0].FECHA_ALTA), '[object Date]');
  assert.strictEqual(u[0].FECHA_ALTA.getDate(), 1);
  assert.deepStrictEqual(plano(u.map(function (x) { return x.NOMBRE + ':' + x._fila; })), ['Ana:2', 'Paola:3']);
  assert.ok(!cache['tabla-Solicitudes'], 'las hojas de operación no se guardan en la caché');
});

test('escribir, editar a mano o leer fresco olvidan la caché de esa hoja', function () {
  const cache = {};
  simulacion(cache).gs.leerTabla_('Usuarios');
  simulacion(cache).gs.actualizarFila_('Usuarios', 2, { ACTIVO: 'NO' });
  assert.ok(!cache['tabla-Usuarios'], 'escribir');

  simulacion(cache).gs.leerTabla_('Usuarios');
  assert.ok(cache['tabla-Usuarios']);
  const s = simulacion(cache);
  s.gs.onEdit({ range: { getSheet: function () { return { getName: function () { return 'Usuarios'; } }; } } });
  assert.ok(!cache['tabla-Usuarios'], 'editar a mano');
  s.gs.onEdit({});
  s.gs.onEdit(undefined);

  simulacion(cache).gs.leerTabla_('Areas');
  const f = simulacion(cache);
  f.gs.leerTabla_('Usuarios');
  const antes = f.cuenta.lecturas.Usuarios;
  f.datos.Usuarios[1][2] = 'NO';
  assert.strictEqual(f.gs.leerTablaFresca_('Usuarios')[0].ACTIVO, 'NO');
  assert.strictEqual(f.cuenta.lecturas.Usuarios, antes + 1, 'leer fresco va a la hoja');
  const g = simulacion(cache);
  g.gs.leerTablaFresca_('Usuarios');
  g.gs.leerTabla_('Areas');
  assert.strictEqual(g.cuenta.lecturas.Areas, undefined, 'las demás estables siguen viniendo de la caché');
});
