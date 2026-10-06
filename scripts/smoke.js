// BANKPULSE - pruebas de humo de las historias del Sprint 1 (PRB-BP-xx). Node 20+, sin dependencias.
// Dentro del contenedor:  docker compose exec bankpulse-api node scripts/smoke.js all
// Desde el host:          BASE_URL=http://localhost:3001 node scripts/smoke.js all
// Secciones: health | hu01 | hu02 | hu03 | hu04 | all
const BASE = process.env.BASE_URL || 'http://localhost:3000';
let fallos = 0;

const verificar = (condicion, mensaje) => {
  console.log(`${condicion ? 'PASS' : 'FAIL'}  ${mensaje}`);
  if (!condicion) fallos += 1;
};
const titulo = (texto) => console.log(`\n== ${texto} ==`);
const fechaEnDias = (n) => new Date(Date.now() + n * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

async function http(metodo, ruta, cuerpo) {
  const respuesta = await fetch(BASE + ruta, {
    method: metodo,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  let datos = null;
  try { datos = await respuesta.json(); } catch (e) { /* sin cuerpo JSON */ }
  return { estado: respuesta.status, datos };
}

const unico = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const ctx = {};

async function health() {
  titulo('PRB-BP-00b  GET /health  (TEC-BP-02)');
  const r = await http('GET', '/health');
  verificar(r.estado === 200, `GET /health responde 200 (obtuvo ${r.estado})`);
  verificar(r.datos && r.datos.base_de_datos === 'ok', 'la base de datos responde (base_de_datos = ok)');
}

async function hu01() {
  titulo('PRB-BP-01  HU-BP-01  Buscar restaurantes por cercania');
  let r = await http('GET', '/restaurantes?lat=-0.18&lng=-78.48&radio_km=5');
  const lista = (r.datos && r.datos.restaurantes) || [];
  verificar(r.estado === 200 && lista.length > 0, `CA-BP-01-1: 200 con restaurantes dentro del radio (${lista.length})`);
  const orden = lista.every((x, i) => i === 0 || lista[i - 1].distancia_km <= x.distancia_km);
  verificar(orden && lista.every((x) => typeof x.distancia_km === 'number'), 'CA-BP-01-1: ordenados por distancia ascendente e incluyen distancia_km');
  r = await http('GET', '/restaurantes?lat=10&lng=10&radio_km=1');
  verificar(r.estado === 200 && r.datos.restaurantes.length === 0 && !!r.datos.mensaje, 'CA-BP-01-2: 200 con lista vacia y mensaje informativo');
  r = await http('GET', '/restaurantes?lat=abc&lng=-78.48');
  verificar(r.estado === 400 && Array.isArray(r.datos.detalle) && r.datos.detalle.length > 0, 'CA-BP-01-3: 400 con detalle del error si el parametro es invalido');
  r = await http('GET', '/restaurantes?lng=-78.48');
  verificar(r.estado === 400, 'CA-BP-01-3: 400 si falta un parametro');
}

async function hu02() {
  titulo('PRB-BP-02  HU-BP-02  Filtrar por fecha y hora con disponibilidad');
  const fecha = fechaEnDias(7);
  let r = await http('GET', `/restaurantes/1/franjas?fecha=${fecha}&hora=19:00`);
  const franjas = (r.datos && r.datos.franjas) || [];
  verificar(r.estado === 200 && franjas.length > 0, `CA-BP-02-1: 200 con franjas (${franjas.length})`);
  verificar(franjas.every((f) => f.hora >= '19:00' && f.cupos_disponibles > 0), 'CA-BP-02-1: solo franjas desde la hora indicada y con cupos > 0');
  r = await http('GET', `/restaurantes/1/franjas?fecha=${fechaEnDias(-3)}&hora=19:00`);
  verificar(r.estado === 400, 'CA-BP-02-2: 400 con fecha pasada');
  r = await http('GET', '/restaurantes/1/franjas?fecha=31-12-2026');
  verificar(r.estado === 400, 'CA-BP-02-2: 400 con formato de fecha invalido');
  r = await http('GET', `/restaurantes/9999/franjas?fecha=${fecha}&hora=19:00`);
  verificar(r.estado === 404, 'CA-BP-02-3: 404 con restaurante inexistente');
}

// Devuelve null si el listado de franjas (HU-BP-02) aun no esta integrado en esta rama.
async function cuposDe(franjaId, fecha) {
  const r = await http('GET', `/restaurantes/1/franjas?fecha=${fecha}`);
  if (r.estado !== 200) return null;
  const f = (r.datos.franjas || []).find((x) => x.id === franjaId);
  return f ? f.cupos_disponibles : 0;
}
const comparar = (actual, esperado, mensaje) => {
  if (actual === null || esperado === null) console.log(`SKIP  ${mensaje} (requiere HU-BP-02 integrada)`);
  else verificar(actual === esperado, mensaje);
};

async function hu03() {
  titulo('PRB-BP-03  HU-BP-03  Reservar con compra');
  const fecha = fechaEnDias(8 + Math.floor(Math.random() * 90)); // fecha distinta en cada corrida: los cupos no se agotan
  let r = await http('GET', `/restaurantes/1/franjas?fecha=${fecha}&hora=19:00`);
  const franja = r.estado === 200 ? r.datos.franjas[0] : { id: 1 + Math.floor(Math.random() * 2000) };
  const antes = await cuposDe(franja.id, fecha);
  const clave = `smoke-${unico()}`;
  const cuerpo = { cliente_id: 1, franja_id: franja.id, comensales: 2, token_pago: 'tok_demo', clave_idempotencia: clave };

  r = await http('POST', '/reservas', cuerpo);
  verificar(r.estado === 201 && r.datos.reserva && r.datos.reserva.estado === 'CONFIRMADA' && r.datos.reserva.estado_pago === 'AUTORIZADO',
    `CA-BP-03-1: 201, reserva CONFIRMADA y pago AUTORIZADO (estado ${r.estado})`);
  ctx.codigo = r.datos.reserva && r.datos.reserva.codigo_confirmacion;
  verificar(/^BP-[A-Z0-9]{6}$/.test(ctx.codigo || ''), `CA-BP-04-2: codigo con formato BP-XXXXXX (${ctx.codigo})`);
  comparar(await cuposDe(franja.id, fecha), antes === null ? null : antes - 2, 'CA-BP-03-1: el cupo se desconto en 2');

  const repetida = await http('POST', '/reservas', cuerpo);
  verificar(repetida.estado === 200 && repetida.datos.reserva.codigo_confirmacion === ctx.codigo, 'CA-BP-03-4: misma clave de idempotencia devuelve la misma reserva');
  comparar(await cuposDe(franja.id, fecha), antes === null ? null : antes - 2, 'CA-BP-03-4: no hay segundo cobro ni segundo descuento de cupo');

  const antesRechazo = await cuposDe(franja.id, fecha);
  r = await http('POST', '/reservas', { ...cuerpo, token_pago: 'tok_rechazado', clave_idempotencia: `smoke-${unico()}` });
  verificar(r.estado === 402, `CA-BP-03-3: 402 con tok_rechazado (obtuvo ${r.estado})`);
  comparar(await cuposDe(franja.id, fecha), antesRechazo, 'CA-BP-03-3: el cupo no cambia cuando el pago es rechazado');

  r = await http('POST', '/reservas', { ...cuerpo, comensales: 20, clave_idempotencia: `smoke-${unico()}`, franja_id: franja.id });
  verificar(r.estado === 409, `CA-BP-03-2: 409 sin cupo suficiente (obtuvo ${r.estado})`);
  r = await http('POST', '/reservas', { cliente_id: 1 });
  verificar(r.estado === 400, 'validacion: 400 con datos incompletos');
}

async function hu04() {
  titulo('PRB-BP-04  HU-BP-04  Confirmacion digital');
  if (!ctx.codigo) await hu03();
  let r = await http('GET', `/reservas/${ctx.codigo}`);
  verificar(r.estado === 200 && r.datos.reserva.codigo_confirmacion === ctx.codigo, 'CA-BP-04-1: 200 con el detalle de la reserva');
  verificar(!!(r.datos.reserva && r.datos.reserva.restaurante && r.datos.reserva.fecha && r.datos.reserva.hora && r.datos.reserva.comensales && r.datos.reserva.monto && r.datos.reserva.estado),
    'CA-BP-04-1: incluye restaurante, fecha, hora, comensales, monto y estado');
  r = await http('GET', '/reservas/BP-ZZZZZZ');
  verificar(r.estado === 404, 'CA-BP-04-3: 404 con codigo inexistente');
}

const secciones = { health, hu01, hu02, hu03, hu04 };

(async () => {
  const pedida = process.argv[2] || 'all';
  const lista = pedida === 'all' ? Object.keys(secciones) : [pedida];
  if (lista.some((s) => !secciones[s])) {
    console.error(`Seccion desconocida: ${pedida}. Use: ${Object.keys(secciones).join(' | ')} | all`);
    process.exit(2);
  }
  console.log(`BANKPULSE smoke tests contra ${BASE}  (${new Date().toISOString()})`);
  for (const nombre of lista) await secciones[nombre]();
  console.log(`\nResultado: ${fallos === 0 ? 'TODAS LAS PRUEBAS PASARON' : `${fallos} PRUEBA(S) FALLARON`}`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((error) => { console.error('Error ejecutando las pruebas:', error.message); process.exit(1); });
