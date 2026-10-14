const ConfiguracionContratoModel = require('../models/configuracion_contratoModel');

const configuracionContratoController = {
  // Obtener configuración actual
  async getCurrent(req, res) {
    try {
      const configuracion = await ConfiguracionContratoModel.getCurrent();
      if (!configuracion) {
        return res.status(404).json({ 
          success: false, 
          error: 'No hay configuración registrada' 
        });
      }
      res.json({ success: true, data: configuracion });
    } catch (error) {
      console.error('Error en getCurrent:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Obtener todas las configuraciones (historial)
  async getAll(req, res) {
    try {
      const configuraciones = await ConfiguracionContratoModel.getAll();
      res.json({ success: true, data: configuraciones });
    } catch (error) {
      console.error('Error en getAll:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Obtener configuración por ID
  async getById(req, res) {
    try {
      const configuracion = await ConfiguracionContratoModel.getById(req.params.id);
      if (!configuracion) {
        return res.status(404).json({ 
          success: false, 
          error: 'Configuración no encontrada' 
        });
      }
      res.json({ success: true, data: configuracion });
    } catch (error) {
      console.error('Error en getById:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Crear nueva configuración
  async create(req, res) {
    try {
      const nuevaConfiguracion = await ConfiguracionContratoModel.create({
        ...req.body,
        created_by: req.user?.name || 'sistema'
      });
      
      res.status(201).json({ 
        success: true, 
        message: 'Configuración creada exitosamente',
        data: nuevaConfiguracion 
      });
    } catch (error) {
      console.error('Error en create:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Actualizar configuración existente
  async update(req, res) {
    try {
      const configuracionActual = await ConfiguracionContratoModel.getById(req.params.id);
      
      if (!configuracionActual) {
        return res.status(404).json({ 
          success: false, 
          error: 'Configuración no encontrada' 
        });
      }

      const configuracionActualizada = await ConfiguracionContratoModel.update(
        req.params.id,
        {
          ...req.body,
          updated_by: req.user?.name || 'sistema'
        }
      );

      // Registrar cambios en historial
      const campos = [
        'interes_porcentaje',
        'morosidad_porcentaje',
        'flat_porcentaje',
        'cuotas_obligatorias',
        'cuotas_gracia',
        'frecuencia_pago',
        'cedula_pago',
        'banco_pago',
        'cuenta_pago'
      ];

      for (const campo of campos) {
        if (req.body[campo] !== undefined && req.body[campo] != configuracionActual[campo]) {
          await ConfiguracionContratoModel.createHistorial({
            id_configuracion: req.params.id,
            campo_modificado: campo,
            valor_anterior: String(configuracionActual[campo] || ''),
            valor_nuevo: String(req.body[campo] || ''),
            usuario: req.user?.name || 'sistema',
            motivo: req.body.motivo_cambio || 'Actualización de configuración'
          });
        }
      }

      res.json({ 
        success: true, 
        message: 'Configuración actualizada exitosamente',
        data: configuracionActualizada 
      });
    } catch (error) {
      console.error('Error en update:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Eliminar configuración
  async delete(req, res) {
    try {
      const configuracion = await ConfiguracionContratoModel.delete(req.params.id);
      if (!configuracion) {
        return res.status(404).json({ 
          success: false, 
          error: 'Configuración no encontrada' 
        });
      }
      res.json({ 
        success: true, 
        message: 'Configuración desactivada (borrado lógico). Permanece en base de datos.',
        data: configuracion 
      });
    } catch (error) {
      console.error('Error en delete:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Obtener historial de cambios
  async getHistorial(req, res) {
    try {
      const historial = await ConfiguracionContratoModel.getHistorial(req.params.id);
      res.json({ success: true, data: historial });
    } catch (error) {
      console.error('Error en getHistorial:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = configuracionContratoController;