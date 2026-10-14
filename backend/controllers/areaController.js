const AreaModel = require('../models/areaModel');

const areaController = {
  async getAll(req, res) {
    try {
      const incluir = String(req.query.incluirInactivos || '') === '1';
      const data = await AreaModel.getAll(incluir);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error en getAll areas:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const area = await AreaModel.getById(req.params.id);
      if (!area) {
        return res.status(404).json({ success: false, error: 'Área no encontrada' });
      }
      res.json({ success: true, data: area });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async create(req, res) {
    try {
      const { nombre_area, codigo, descripcion } = req.body;
      if (!nombre_area || !String(nombre_area).trim()) {
        return res.status(400).json({ success: false, error: 'El nombre del área es obligatorio' });
      }
      const data = await AreaModel.create({ nombre_area, codigo, descripcion });
      res.status(201).json({ success: true, data });
    } catch (error) {
      const msg = error.message || 'Error al crear el área';
      const dup = error.code === '23505';
      res.status(dup ? 400 : 500).json({
        success: false,
        error: dup ? 'Ya existe un área con ese nombre o código' : msg,
      });
    }
  },

  async update(req, res) {
    try {
      const area = await AreaModel.getById(req.params.id);
      if (!area) {
        return res.status(404).json({ success: false, error: 'Área no encontrada' });
      }
      const data = await AreaModel.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (error) {
      const dup = error.code === '23505';
      res.status(dup ? 400 : 500).json({
        success: false,
        error: dup ? 'Ya existe un área con ese nombre o código' : error.message,
      });
    }
  },

  async delete(req, res) {
    try {
      const area = await AreaModel.getById(req.params.id);
      if (!area) {
        return res.status(404).json({ success: false, error: 'Área no encontrada' });
      }
      const data = await AreaModel.softDelete(req.params.id);
      res.json({
        success: true,
        message: 'Área desactivada (borrado lógico).',
        data,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

module.exports = areaController;
