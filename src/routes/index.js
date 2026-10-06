// Rutas de BANKPULSE: cada ruta delega en un Controlador (MVC).
// Los controladores se cargan de forma perezosa: si un controlador aun no existe en la rama
// (historia pendiente de integrar), la ruta responde 501 en lugar de romper el arranque.
// Gracias a esto este archivo no cambia al integrar cada historia y los Pull Requests no chocan.
const router = require('express').Router();

function ruta(archivo, metodo, historia) {
  return (req, res, next) => {
    let controlador;
    try {
      controlador = require(`../controllers/${archivo}`);
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND' && String(error.message).includes(`controllers/${archivo}`)) {
        return res.status(501).json({ error: `Pendiente de implementar (${historia})`, controlador: archivo, metodo });
      }
      return next(error);
    }
    return controlador[metodo](req, res, next);
  };
}

router.get('/health', ruta('SaludController', 'estado', 'TEC-BP-02'));
router.get('/restaurantes', ruta('RestauranteController', 'listarCercanos', 'HU-BP-01'));
router.get('/restaurantes/:id/franjas', ruta('RestauranteController', 'listarFranjas', 'HU-BP-02'));
router.post('/reservas', ruta('ReservaController', 'crear', 'HU-BP-03'));
router.post('/pagos/autorizar', ruta('PagoController', 'autorizar', 'HU-BP-03'));
router.get('/reservas/:codigo', ruta('ReservaController', 'obtenerPorCodigo', 'HU-BP-04'));

module.exports = router;
