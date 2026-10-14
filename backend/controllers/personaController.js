const PersonaModel = require('../models/personaModel');

const personaController = {
  // Obtener todas las personas
  async getAll(req, res) {
    try {
      const personas = await PersonaModel.getAll();
      res.json({ success: true, data: personas });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Obtener persona por ID
  async getById(req, res) {
    try {
      const persona = await PersonaModel.getById(req.params.cedula);
      if (!persona) {
        return res.status(404).json({ success: false, error: 'Persona no encontrada' });
      }
      res.json({ success: true, data: persona });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Obtener persona por cédula
  async getByCedula(req, res) {
    try {
      const persona = await PersonaModel.getByCedula(req.params.cedula);
      if (!persona) {
        return res.status(404).json({ success: false, error: 'Persona no encontrada' });
      }
      res.json({ success: true, data: persona });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Crear persona
  async create(req, res) {
    try {
      // Verificar si ya existe la cédula
      const existeCedula = await PersonaModel.getByCedula(req.body.cedula);
      if (existeCedula) {
        return res.status(400).json({ success: false, error: 'Ya existe una persona con esta cédula' });
      }

      // Verificar si ya existe el correo
      const existeCorreo = await PersonaModel.getByCorreo(req.body.correo);
      if (existeCorreo) {
        return res.status(400).json({ success: false, error: 'Ya existe una persona con este correo' });
      }

      const nuevaPersona = await PersonaModel.create(req.body);
      res.status(201).json({ success: true, data: nuevaPersona });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Actualizar persona
  async update(req, res) {
    try {
      const persona = await PersonaModel.update(req.params.cedula, req.body);
      if (!persona) {
        return res.status(404).json({ success: false, error: 'Persona no encontrada' });
      }
      res.json({ success: true, data: persona });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Eliminar persona
  async delete(req, res) {
    try {
      const persona = await PersonaModel.delete(req.params.cedula);
      if (!persona) {
        return res.status(404).json({ success: false, error: 'Persona no encontrada' });
      }
      res.json({ success: true, message: 'Persona eliminada correctamente', data: persona });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Obtener personas por tipo
  async getByTipo(req, res) {
    try {
      const personas = await PersonaModel.getByTipo(req.params.tipo);
      res.json({ success: true, data: personas });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = personaController;