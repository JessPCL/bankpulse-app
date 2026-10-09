// MVC-BP-11 - RestauranteController (HU-BP-01, HU-BP-02).
const crypto = require('crypto');
const Restaurante = require('../models/Restaurante');
const FranjaReserva = require('../models/FranjaReserva');
const { pool } = require('../config/db');

const hoyEnQuito = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
const numero = (valor) => (valor === undefined || valor === '' ? NaN : Number(valor));
const fechaValida = (texto) =>
  /^\d{4}-\d{2}-\d{2}$/.test(texto || '') &&
  new Date(`${texto}T00:00:00Z`).toISOString().slice(0, 10) === texto;

module.exports = {
  // GET /restaurantes?lat=&lng=&radio_km=   (HU-BP-01)
  async listarCercanos(req, res, next) {
    try {
      const sinParametros = Object.keys(req.query).filter((k) => k !== 'formato').length === 0;
      if (sinParametros && !res.quiereJson) {
        return res.render('restaurantes/lista', { restaurantes: null, consulta: {}, error: null, detalle: [], mensaje: null });
      }
      const lat = numero(req.query.lat);
      const lng = numero(req.query.lng);
      const radio = req.query.radio_km === undefined ? 5 : numero(req.query.radio_km);
      const errores = [];
      if (!(lat >= -90 && lat <= 90)) errores.push('lat debe ser un numero entre -90 y 90');
      if (!(lng >= -180 && lng <= 180)) errores.push('lng debe ser un numero entre -180 y 180');
      if (!(radio > 0 && radio <= 100)) errores.push('radio_km debe ser mayor que 0 y maximo 100');
      const consulta = { lat: req.query.lat, lng: req.query.lng, radio_km: req.query.radio_km === undefined ? 5 : req.query.radio_km };
      if (errores.length) {
        return res.responder('restaurantes/lista', { restaurantes: null, consulta, error: 'Parametros invalidos', detalle: errores, mensaje: null }, 400);
      }
      const restaurantes = await Restaurante.cercanos(lat, lng, radio);
      return res.responder('restaurantes/lista', {
        restaurantes,
        total: restaurantes.length,
        consulta,
        error: null,
        detalle: [],
        mensaje: restaurantes.length ? null : 'No hay restaurantes dentro del radio indicado',
      });
    } catch (error) {
      return next(error);
    }
  },

  // GET /restaurantes/:id/franjas?fecha=YYYY-MM-DD&hora=HH:MM   (HU-BP-02)
  async listarFranjas(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id <= 0) {
        return res.responder('restaurantes/detalle', { restaurante: null, franjas: null, consulta: {}, error: 'id invalido', detalle: [] }, 400);
      }
      const restaurante = await Restaurante.buscarPorId(id);
      if (!restaurante) {
        return res.responder('restaurantes/detalle', { restaurante: null, franjas: null, consulta: {}, error: 'Restaurante no encontrado', detalle: [] }, 404);
      }
      const consulta = { fecha: req.query.fecha, hora: req.query.hora };
      const sinFiltros = !req.query.fecha && !req.query.hora;
      if (sinFiltros && !res.quiereJson) {
        return res.render('restaurantes/detalle', { restaurante, franjas: null, consulta, error: null, detalle: [] });
      }
      const hora = req.query.hora || '00:00';
      const errores = [];
      if (!fechaValida(req.query.fecha)) errores.push('fecha es obligatoria con formato YYYY-MM-DD');
      else if (req.query.fecha < hoyEnQuito()) errores.push('fecha no puede ser pasada');
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) errores.push('hora debe tener formato HH:MM');
      if (errores.length) {
        return res.responder('restaurantes/detalle', { restaurante, franjas: null, consulta, error: 'Parametros invalidos', detalle: errores }, 400);
      }
      const franjas = (await FranjaReserva.disponibles(id, req.query.fecha, hora)).map((f) => ({
        ...f,
        clave_sugerida: crypto.randomUUID(),
      }));
      return res.responder('restaurantes/detalle', { restaurante, franjas, total: franjas.length, consulta, error: null, detalle: [] });
    } catch (error) {
      return next(error);
    }
  },
};
