// MVC-BP-13 - PagoController: expone la pasarela simulada para pruebas (HU-BP-03).
const PasarelaSimulada = require('../services/PasarelaSimulada');

module.exports = {
  // POST /pagos/autorizar  { "token_pago": "tok_demo", "monto": 30 }
  autorizar(req, res) {
    const { token_pago: token, monto } = req.body || {};
    const resultado = PasarelaSimulada.autorizar(token, Number(monto));
    return res.status(resultado.aprobado ? 200 : 402).json(resultado);
  },
};
