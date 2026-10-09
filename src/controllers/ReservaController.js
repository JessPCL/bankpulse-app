// MVC-BP-12 - ReservaController: reserva con compra en una sola transaccion (HU-BP-03) y confirmacion (HU-BP-04).
const { pool } = require('../config/db');
const Reserva = require('../models/Reserva');
const FranjaReserva = require('../models/FranjaReserva');
const Cliente = require('../models/Cliente');
const Pago = require('../models/Pago');
const PasarelaSimulada = require('../services/PasarelaSimulada');

const redondear = (valor) => Math.round(valor * 100) / 100;

// Cierra la transaccion y responde con la Vista checkout (HTML) o JSON.
async function abortar(cliente, res, estado, datos) {
  await cliente.query('ROLLBACK');
  return res.responder('reservas/checkout', { reserva: null, mensaje: null, detalle: [], ...datos }, estado);
}

module.exports = {
  // POST /reservas
  // { cliente_id, franja_id, comensales, token_pago, clave_idempotencia }  (o cabecera Idempotency-Key)
  async crear(req, res, next) {
    const cuerpo = req.body || {};
    const clave = cuerpo.clave_idempotencia || req.get('Idempotency-Key');
    const clienteId = parseInt(cuerpo.cliente_id, 10);
    const franjaId = parseInt(cuerpo.franja_id, 10);
    const comensales = parseInt(cuerpo.comensales, 10);
    const token = cuerpo.token_pago;

    const errores = [];
    if (!Number.isInteger(clienteId) || clienteId <= 0) errores.push('cliente_id es obligatorio');
    if (!Number.isInteger(franjaId) || franjaId <= 0) errores.push('franja_id es obligatorio');
    if (!Number.isInteger(comensales) || comensales < 1 || comensales > 20) errores.push('comensales debe ser un entero entre 1 y 20');
    if (typeof token !== 'string' || !token) errores.push('token_pago es obligatorio');
    if (typeof clave !== 'string' || clave.length < 8 || clave.length > 100) errores.push('clave_idempotencia es obligatoria (8 a 100 caracteres)');
    if (errores.length) {
      return res.responder('reservas/checkout', { reserva: null, mensaje: null, error: 'Datos invalidos', detalle: errores }, 400);
    }

    const conexion = await pool.connect();
    try {
      await conexion.query('BEGIN');

      // Idempotencia: la misma clave devuelve la misma reserva, sin segundo cobro.
      const previa = await Reserva.buscarPorClave(conexion, clave);
      if (previa) {
        await conexion.query('COMMIT');
        return res.responder('reservas/checkout', { reserva: previa, mensaje: 'Reserva ya registrada con esta clave de idempotencia', error: null, detalle: [] }, 200);
      }

      const cliente = await Cliente.buscarPorId(conexion, clienteId);
      if (!cliente) return await abortar(conexion, res, 404, { error: 'Cliente no encontrado' });

      const franja = await FranjaReserva.buscarPorId(conexion, franjaId);
      if (!franja) return await abortar(conexion, res, 404, { error: 'Franja no encontrada' });
      if (franja.cupos_disponibles < comensales) {
        return await abortar(conexion, res, 409, { error: 'La franja no tiene cupo suficiente', cupos_disponibles: franja.cupos_disponibles });
      }

      const monto = redondear(franja.precio_por_persona * comensales);
      const autorizacion = PasarelaSimulada.autorizar(token, monto);
      if (!autorizacion.aprobado) {
        await conexion.query('ROLLBACK');
        // Auditoria (RNF-BP-05): el rechazo queda registrado fuera de la transaccion revertida.
        await Pago.crear(pool, { reservaId: null, clienteId, monto, tokenPago: token, estado: 'RECHAZADO' });
        return res.responder('reservas/checkout', { reserva: null, mensaje: null, error: 'Pago rechazado', detalle: [autorizacion.motivo] }, 402);
      }

      if (!(await FranjaReserva.descontarCupo(conexion, franjaId, comensales))) {
        return await abortar(conexion, res, 409, { error: 'La franja no tiene cupo suficiente' });
      }

      const nueva = await Reserva.crear(conexion, { codigo: Reserva.generarCodigo(), clienteId, franjaId, comensales, monto, clave });
      await Pago.crear(conexion, { reservaId: nueva.id, clienteId, monto, tokenPago: token, estado: 'AUTORIZADO', referencia: autorizacion.referencia });
      await conexion.query('COMMIT');

      const reserva = await Reserva.buscarPorClave(pool, clave);
      return res.responder('reservas/checkout', { reserva, mensaje: 'Reserva confirmada y pago autorizado', error: null, detalle: [] }, 201);
    } catch (error) {
      try { await conexion.query('ROLLBACK'); } catch (e) { /* conexion ya cerrada */ }
      if (error.code === '23505') { // Dos solicitudes simultaneas con la misma clave: gana una, la otra recibe esa reserva.
        const existente = await Reserva.buscarPorClave(pool, clave);
        if (existente) return res.responder('reservas/checkout', { reserva: existente, mensaje: 'Reserva ya registrada con esta clave de idempotencia', error: null, detalle: [] }, 200);
      }
      return next(error);
    } finally {
      conexion.release();
    }
  },

  // GET /reservas/:codigo
  async obtenerPorCodigo(req, res, next) {
    try {
      const reserva = await Reserva.buscarPorCodigo(pool, String(req.params.codigo).toUpperCase());
      if (!reserva) return res.responder('reservas/confirmacion', { reserva: null, error: 'Reserva no encontrada' }, 404);
      return res.responder('reservas/confirmacion', { reserva, error: null });
    } catch (error) {
      return next(error);
    }
  },
};
