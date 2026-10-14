const CitaModel = require('../models/citaModel');
const NotificacionModel = require('../models/notificacionModel');

const citaController = {
  getAll: async (req, res) => {
    try {
      const data = await CitaModel.getAll({
        desde: req.query.desde,
        hasta: req.query.hasta,
        id_inspector: req.query.id_inspector
      });
      res.json({ success: true, data, count: data.length });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const data = await CitaModel.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, error: 'Cita no encontrada' });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const created_by = parseInt(req.headers['x-user-id'] || req.body.created_by, 10) || null;
      const data = await CitaModel.create({ ...req.body, created_by });

      // Notificar al inspector
      try {
        await NotificacionModel.create({
          id_usuario_destino: data.id_inspector,
          id_usuario_origen: created_by,
          titulo: 'Nueva cita asignada',
          mensaje: `${data.titulo} el ${data.fecha_cita} a las ${data.hora_inicio}`,
          tipo: 'cita',
          modulo: 'citas',
          enlace: '/Citas'
        });
      } catch (_) { /* ignore */ }

      res.status(201).json({ success: true, data, message: 'Cita registrada' });
    } catch (error) {
      const code = error.message.includes('ya tiene una cita') ? 409 : 400;
      res.status(code).json({ success: false, error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const data = await CitaModel.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (error) {
      const code = error.message.includes('ya tiene una cita') ? 409 : 400;
      res.status(code).json({ success: false, error: error.message });
    }
  },

  cancelar: async (req, res) => {
    try {
      const data = await CitaModel.cancelar(req.params.id);
      if (!data) return res.status(404).json({ success: false, error: 'No encontrada' });
      res.json({ success: true, data });
    } catch (error) {
      const msg = error.message || 'Error al cancelar';
      const code =
        msg.includes('No se puede cancelar') ? 400 : 500;
      res.status(code).json({ success: false, error: msg });
    }
  }
};

module.exports = citaController;
