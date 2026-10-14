const ClasificacionEmprendimientoModel = require('../models/clasificacionEmprendimientoModel');

const clasificacionEmprendimientoController = {
  // Obtener todas las clasificaciones
  async getAll(req, res) {
    try {
      const clasificaciones = await ClasificacionEmprendimientoModel.getAll();
      res.json({ success: true, data: clasificaciones });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Obtener clasificación por id_clasificacion
  async getById(req, res) {
    try {
      const clasificacion = await ClasificacionEmprendimientoModel.getById(req.params.id_clasificacion);
      if (!clasificacion) {
        return res.status(404).json({ success: false, error: 'Clasificación no encontrada' });
      }
      res.json({ success: true, data: clasificacion });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Crear nueva clasificación
  async create(req, res) {
    try {
      // Validar que n_ins_asig sea 1 o 2
      if (req.body.n_ins_asig && ![1, 2].includes(req.body.n_ins_asig)) {
        return res.status(400).json({ success: false, error: 'n_ins_asig debe ser 1 o 2' });
      }

      const nuevaClasificacion = await ClasificacionEmprendimientoModel.create(req.body);
      res.status(201).json({ success: true, data: nuevaClasificacion });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Actualizar clasificación
  async update(req, res) {
    try {
      // Validar que n_ins_asig sea 1 o 2 si viene en la petición
      if (req.body.n_ins_asig && ![1, 2].includes(req.body.n_ins_asig)) {
        return res.status(400).json({ success: false, error: 'n_ins_asig debe ser 1 o 2' });
      }

      const clasificacion = await ClasificacionEmprendimientoModel.update(req.params.id_clasificacion, req.body);
      if (!clasificacion) {
        return res.status(404).json({ success: false, error: 'Clasificación no encontrada' });
      }
      res.json({ success: true, data: clasificacion });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Eliminar clasificación
  async delete(req, res) {
    try {
      const clasificacion = await ClasificacionEmprendimientoModel.delete(req.params.id_clasificacion);
      if (!clasificacion) {
        return res.status(404).json({ success: false, error: 'Clasificación no encontrada' });
      }
      res.json({
        success: true,
        message: 'Clasificación desactivada (borrado lógico). Permanece en base de datos.',
        data: clasificacion,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = clasificacionEmprendimientoController;