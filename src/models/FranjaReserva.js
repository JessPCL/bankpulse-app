// MVC-BP-02 - Modelo FranjaReserva (HU-BP-02, HU-BP-03).
const { query } = require('../config/db');

module.exports = {
  // Franjas del restaurante en la fecha, desde la hora indicada y con cupo disponible.
  async disponibles(restauranteId, fecha, hora) {
    const { rows } = await query(
      `SELECT id, restaurante_id, fecha, to_char(hora, 'HH24:MI') AS hora,
              cupos_disponibles, precio_por_persona
         FROM franjas_reserva
        WHERE restaurante_id = $1 AND fecha = $2 AND hora >= $3::time AND cupos_disponibles > 0
        ORDER BY hora ASC`,
      [restauranteId, fecha, hora]
    );
    return rows;
  },

  async buscarPorId(db, id) {
    const { rows } = await db.query(
      `SELECT id, restaurante_id, fecha, to_char(hora, 'HH24:MI') AS hora,
              cupos_disponibles, precio_por_persona
         FROM franjas_reserva WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  // Descuento atomico de cupo: solo ocurre si hay cupos suficientes (evita sobreventa, RNF-BP-02).
  async descontarCupo(db, id, comensales) {
    const { rowCount } = await db.query(
      `UPDATE franjas_reserva
          SET cupos_disponibles = cupos_disponibles - $2
        WHERE id = $1 AND cupos_disponibles >= $2`,
      [id, comensales]
    );
    return rowCount === 1;
  },
};
