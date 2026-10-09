// MVC-BP-04 - Modelo Pago (HU-BP-03). Solo guarda tokens de prueba, nunca datos de tarjeta (RNF-BP-01).
module.exports = {
  async crear(db, { reservaId, clienteId, monto, tokenPago, estado, referencia }) {
    const { rows } = await db.query(
      `INSERT INTO pagos (reserva_id, cliente_id, monto, token_pago, estado, referencia)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, reserva_id, monto, estado, referencia, creado_en`,
      [reservaId, clienteId, monto, tokenPago, estado, referencia || null]
    );
    return rows[0];
  },
};
