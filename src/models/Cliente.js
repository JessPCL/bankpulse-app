// MVC-BP-05 - Modelo Cliente (HU-BP-03).
module.exports = {
  async buscarPorId(db, id) {
    const { rows } = await db.query('SELECT id, nombre, correo FROM clientes WHERE id = $1', [id]);
    return rows[0] || null;
  },
};
