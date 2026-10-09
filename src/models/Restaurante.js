// MVC-BP-01 - Modelo Restaurante (HU-BP-01, HU-BP-02).
const { query } = require('../config/db');

module.exports = {
  // Restaurantes dentro del radio, ordenados por distancia (formula de Haversine, resultado en km).
  async cercanos(lat, lng, radioKm) {
    const { rows } = await query(
      `SELECT id, nombre, direccion, lat, lng, distancia_km FROM (
         SELECT r.id, r.nombre, r.direccion, r.lat, r.lng,
                6371 * acos(LEAST(1, GREATEST(-1,
                  cos(radians($1::float8)) * cos(radians(r.lat)) * cos(radians(r.lng) - radians($2::float8))
                  + sin(radians($1::float8)) * sin(radians(r.lat))))) AS distancia_km
         FROM restaurantes r
       ) t
       WHERE distancia_km <= $3::float8
       ORDER BY distancia_km ASC, id ASC`,
      [lat, lng, radioKm]
    );
    return rows.map((fila) => ({ ...fila, distancia_km: Math.round(fila.distancia_km * 100) / 100 }));
  },

  async buscarPorId(id) {
    const { rows } = await query('SELECT id, nombre, direccion, lat, lng FROM restaurantes WHERE id = $1', [id]);
    return rows[0] || null;
  },
};
