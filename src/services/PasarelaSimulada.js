// MVC-BP-14 - Adapter de la pasarela de pagos. Simula la autorizacion; no hay red ni tarjetas reales.
// Sustituirla por una pasarela real no cambia a los Controladores.
const crypto = require('crypto');

module.exports = {
  autorizar(token, monto) {
    if (typeof token !== 'string' || !/^tok_[a-z0-9_]+$/i.test(token)) {
      return { aprobado: false, motivo: 'TOKEN_INVALIDO' };
    }
    if (token === 'tok_rechazado') return { aprobado: false, motivo: 'FONDOS_INSUFICIENTES' };
    if (!(monto > 0)) return { aprobado: false, motivo: 'MONTO_INVALIDO' };
    return { aprobado: true, referencia: `SIM-${crypto.randomBytes(4).toString('hex').toUpperCase()}` };
  },
};
