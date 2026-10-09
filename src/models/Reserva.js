// MVC-BP-03 - Modelo Reserva (HU-BP-03, HU-BP-04).
const crypto = require('crypto');

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Consulta base con los datos que muestran el checkout y la confirmacion.
const SELECT_DETALLE = `
  SELECT r.id, r.codigo_confirmacion, r.estado, r.comensales, r.monto, r.clave_idempotencia, r.creado_en,
         c.nombre AS cliente, rest.nombre AS restaurante,
         f.fecha, to_char(f.hora, 'HH24:MI') AS hora,
         p.estado AS estado_pago, p.referencia AS referencia_pago
    FROM reservas r
    JOIN clientes c ON c.id = r.cliente_id
    JOIN franjas_reserva f ON f.id = r.franja_id
    JOIN restaurantes rest ON rest.id = f.restaurante_id
    LEFT JOIN pagos p ON p.reserva_id = r.id AND p.estado = 'AUTORIZADO'`;

module.exports = {
  // Codigo unico con formato BP-XXXXXX (HU-BP-04).
  generarCodigo() {
    const bytes = crypto.randomBytes(6);
    let sufijo = '';
    for (const byte of bytes) sufijo += ALFABETO[byte % ALFABETO.length];
    return `BP-${sufijo}`;
  },

  async crear(db, { codigo, clienteId, franjaId, comensales, monto, clave }) {
    const { rows } = await db.query(
      `INSERT INTO reservas (codigo_confirmacion, cliente_id, franja_id, comensales, monto, estado, clave_idempotencia)
       VALUES ($1, $2, $3, $4, $5, 'CONFIRMADA', $6)
       RETURNING id`,
      [codigo, clienteId, franjaId, comensales, monto, clave]
    );
    return rows[0];
  },

  async buscarPorClave(db, clave) {
    const { rows } = await db.query(`${SELECT_DETALLE} WHERE r.clave_idempotencia = $1`, [clave]);
    return rows[0] || null;
  },

  async buscarPorCodigo(db, codigo) {
    const { rows } = await db.query(`${SELECT_DETALLE} WHERE r.codigo_confirmacion = $1`, [codigo]);
    return rows[0] || null;
  },
};
