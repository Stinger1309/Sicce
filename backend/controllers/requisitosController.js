const RequisitosModel = require('../models/requisitosModel');

const requisitosController = {
  // Obtener todos los requisitos
  async getAll(req, res) {
    try {
      const requisitos = await RequisitosModel.getAll();
      res.json({ success: true, data: requisitos });
    } catch (error) {
      console.error('Error en getAll:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Obtener requisito por ID
  async getById(req, res) {
    try {
      const requisito = await RequisitosModel.getById(req.params.id);
      if (!requisito) {
        return res.status(404).json({ success: false, error: 'Requisito no encontrado' });
      }
      res.json({ success: true, data: requisito });
    } catch (error) {
      console.error('Error en getById:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Crear requisito
  async create(req, res) {
    try {
      const { nombre_requisito } = req.body;
      
      if (!nombre_requisito || nombre_requisito.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          error: 'El nombre del requisito es obligatorio' 
        });
      }

      // Verificar si ya existe el requisito
      const existe = await RequisitosModel.getByNombre(nombre_requisito);
      if (existe) {
        return res.status(400).json({ 
          success: false, 
          error: 'Ya existe un requisito con este nombre' 
        });
      }

      const nuevoRequisito = await RequisitosModel.create({ nombre_requisito });
      res.status(201).json({ success: true, data: nuevoRequisito });
    } catch (error) {
      console.error('Error en create:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Actualizar requisito
  async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre_requisito } = req.body;

      if (!nombre_requisito || nombre_requisito.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          error: 'El nombre del requisito es obligatorio' 
        });
      }

      const requisitoActualizado = await RequisitosModel.update(id, { nombre_requisito });
      
      if (!requisitoActualizado) {
        return res.status(404).json({ success: false, error: 'Requisito no encontrado' });
      }
      
      res.json({ success: true, data: requisitoActualizado });
    } catch (error) {
      console.error('Error en update:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Eliminar requisito
  async delete(req, res) {
    try {
      const { id } = req.params;
      const requisitoEliminado = await RequisitosModel.delete(id);
      
      if (!requisitoEliminado) {
        return res.status(404).json({ success: false, error: 'Requisito no encontrado' });
      }
      
      res.json({
        success: true,
        message: 'Requisito desactivado (borrado lógico). Permanece en base de datos.',
        data: requisitoEliminado,
      });
    } catch (error) {
      console.error('Error en delete:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = requisitosController;