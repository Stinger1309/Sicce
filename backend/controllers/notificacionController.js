const NotificacionModel = require('../models/notificacionModel');

const notificacionController = {
  getMias: async (req, res) => {
    try {
      const idUsuario = parseInt(req.headers['x-user-id'] || req.query.id_usuario, 10);
      if (!idUsuario) {
        return res.status(400).json({ success: false, error: 'id de usuario requerido' });
      }
      const data = await NotificacionModel.getByUsuario(idUsuario, {
        soloNoLeidas: req.query.solo_no_leidas === '1',
        limit: parseInt(req.query.limit || '50', 10)
      });
      const no_leidas = await NotificacionModel.countNoLeidas(idUsuario);
      res.json({ success: true, data, no_leidas });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  marcarLeida: async (req, res) => {
    try {
      const idUsuario = parseInt(req.headers['x-user-id'] || req.body.id_usuario, 10);
      const data = await NotificacionModel.marcarLeida(req.params.id, idUsuario);
      if (!data) return res.status(404).json({ success: false, error: 'No encontrada' });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  marcarTodas: async (req, res) => {
    try {
      const idUsuario = parseInt(req.headers['x-user-id'] || req.body.id_usuario, 10);
      await NotificacionModel.marcarTodasLeidas(idUsuario);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  crear: async (req, res) => {
    try {
      const data = await NotificacionModel.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
};

module.exports = notificacionController;
