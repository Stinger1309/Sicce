const EmprendimientoModel = require('../models/emprendimientoModel');

const emprendimientoController = {
  // Obtener todos los emprendimientos
  async getAll(req, res) {
    try {
      const emprendimientos = await EmprendimientoModel.getAll();
      res.json({ success: true, data: emprendimientos });
    } catch (error) {
      console.error('Error en getAll:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Obtener emprendimiento por ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const emprendimiento = await EmprendimientoModel.getById(id);
      
      if (!emprendimiento) {
        return res.status(404).json({ success: false, error: 'Emprendimiento no encontrado' });
      }
      
      res.json({ success: true, data: emprendimiento });
    } catch (error) {
      console.error('Error en getById:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Obtener emprendimiento por ID de solicitud
  async getByIdSolicitud(req, res) {
    try {
      const { id_solicitud } = req.params;
      const emprendimiento = await EmprendimientoModel.getByIdSolicitud(id_solicitud);
      
      if (!emprendimiento) {
        return res.status(404).json({ success: false, error: 'No hay emprendimiento asociado a esta solicitud' });
      }
      
      res.json({ success: true, data: emprendimiento });
    } catch (error) {
      console.error('Error en getByIdSolicitud:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Obtener emprendimientos por cédula
  async getByCedula(req, res) {
    try {
      const { cedula_emprendimiento } = req.params;
      const emprendimientos = await EmprendimientoModel.getByCedula(cedula_emprendimiento);
      
      res.json({ success: true, data: emprendimientos });
    } catch (error) {
      console.error('Error en getByCedula:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Crear nuevo emprendimiento
  async create(req, res) {
    try {
      const { 
        id_solicitud, 
        id_clasificacion, 
        cedula_emprendimiento, 
        anos_experiencia, 
        nombre_emprendimiento, 
        direccion_empredimiento 
      } = req.body;

      // Validar campos requeridos
      if (!id_solicitud || !id_clasificacion || !cedula_emprendimiento || 
          !anos_experiencia || !nombre_emprendimiento || !direccion_empredimiento) {
        return res.status(400).json({ 
          success: false, 
          error: 'Todos los campos son requeridos' 
        });
      }

      // Verificar si ya existe un emprendimiento para esta solicitud
      const existeEmprendimiento = await EmprendimientoModel.getByIdSolicitud(id_solicitud);
      if (existeEmprendimiento) {
        return res.status(400).json({ 
          success: false, 
          error: 'Ya existe un emprendimiento asociado a esta solicitud' 
        });
      }

      const nuevoEmprendimiento = await EmprendimientoModel.create({
        id_solicitud,
        id_clasificacion,
        cedula_emprendimiento,
        anos_experiencia,
        nombre_emprendimiento,
        direccion_empredimiento
      });
      
      res.status(201).json({ success: true, data: nuevoEmprendimiento });
    } catch (error) {
      console.error('Error en create:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Actualizar emprendimiento
  async update(req, res) {
    try {
      const { id } = req.params;
      const { 
        id_clasificacion, 
        anos_experiencia, 
        nombre_emprendimiento, 
        direccion_empredimiento 
      } = req.body;

      const emprendimientoActualizado = await EmprendimientoModel.update(id, {
        id_clasificacion,
        anos_experiencia,
        nombre_emprendimiento,
        direccion_empredimiento
      });
      
      if (!emprendimientoActualizado) {
        return res.status(404).json({ success: false, error: 'Emprendimiento no encontrado' });
      }
      
      res.json({ success: true, data: emprendimientoActualizado });
    } catch (error) {
      console.error('Error en update:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Eliminar emprendimiento
  async delete(req, res) {
    try {
      const { id } = req.params;
      const emprendimiento = await EmprendimientoModel.delete(id);
      
      if (!emprendimiento) {
        return res.status(404).json({ success: false, error: 'Emprendimiento no encontrado' });
      }
      
      res.json({ success: true, message: 'Emprendimiento eliminado correctamente' });
    } catch (error) {
      console.error('Error en delete:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = emprendimientoController;