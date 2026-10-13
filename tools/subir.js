// Sube el proyecto a Apps Script con clasp y, si el ambiente ya tiene implementación, publica la
// versión nueva en el MISMO link.
//
//   npm run pruebas -- "qué cambió"      → BD Procesos - PRUEBAS (.clasp.json)
//   npm run produccion -- "qué cambió"   → BD Procesos (.clasp.prod.json), el que usan todos
//
// Producción solo se sube desde un commit: si hay cambios sin commit en src/ o en appsscript.json,
// se detiene, para que lo publicado siempre sea algo que está en GitHub. La descripción de la
// versión lleva el commit.
//
// clasp reemplaza TODO el proyecto con lo que hay aquí (lo que solo exista en el editor se borra).
// Qué se sube lo dice .claspignore: appsscript.json y src/.
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');

// `implementacion` es el ID de la implementación de la web app (Implementar → Gestionar
// implementaciones). Mientras esté vacío, solo se sube el código.
const AMBIENTES = {
  pruebas: { nombre: 'PRUEBAS', proyecto: '.clasp.json', implementacion: '' },
  produccion: { nombre: 'PRODUCCION', proyecto: '.clasp.prod.json', implementacion: '' }
};

const ambiente = AMBIENTES[process.argv[2]];
const mensaje = process.argv.slice(3).join(' ').replace(/"/g, "'").trim();
if (!ambiente) { console.error('Uso: npm run pruebas -- "qué cambió"   ·   npm run produccion -- "qué cambió"'); process.exit(1); }
if (!mensaje) { console.error('Falta decir qué cambió, por ejemplo: npm run ' + process.argv[2] + ' -- "Instalador de la base"'); process.exit(1); }
if (!fs.existsSync(ambiente.proyecto)) {
  console.error('No existe ' + ambiente.proyecto + '. Cópialo de .clasp.json.example con el ID del proyecto (docs/ambientes.md).');
  process.exit(1);
}

const git = function (args) { return execSync('git ' + args, { encoding: 'utf8' }).trim(); };
let descripcion = mensaje;
if (ambiente.nombre === 'PRODUCCION') {
  const pendientes = git('status --porcelain -- src appsscript.json');
  if (pendientes) {
    console.error('Hay cambios sin commit; producción solo se sube desde un commit:\n' + pendientes);
    process.exit(1);
  }
  descripcion = mensaje + ' (' + git('rev-parse --short HEAD') + ')';
}

const clasp = function (args) {
  console.log('\n> clasp ' + args);
  const r = spawnSync('clasp ' + args, { stdio: 'inherit', shell: true });
  if (r.status !== 0) { console.error('\nclasp terminó con error: no se siguió.'); process.exit(r.status || 1); }
};

console.log('Subiendo a ' + ambiente.nombre + ': ' + descripcion);
clasp('-P ' + ambiente.proyecto + ' push --force');
if (ambiente.implementacion) {
  clasp('-P ' + ambiente.proyecto + ' redeploy ' + ambiente.implementacion + ' -d "' + descripcion + '"');
  console.log('\nListo: ' + ambiente.nombre + ' ya tiene la versión nueva en su link de siempre.');
} else {
  console.log('\nListo: código subido a ' + ambiente.nombre + ' (todavía no hay implementación de la web app).');
}
