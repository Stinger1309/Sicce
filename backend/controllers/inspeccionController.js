// backend/controllers/inspeccionController.js
const InspeccionModel = require('../models/inspeccionModel');

const inspeccionController = {

  // backend/controllers/inspeccionController.js

  // Obtener datos completos de una inspección
  getFullInspectionData: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID de inspección inválido' 
        });
      }

      const inspeccion = await InspeccionModel.getFullInspectionData(id);
      
      if (!inspeccion) {
        return res.status(404).json({ 
          success: false, 
          error: 'Inspección no encontrada' 
        });
      }

      res.json({ 
        success: true, 
        data: inspeccion,
        message: 'Datos completos de inspección obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error en getFullInspectionData:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener datos completos de la inspección',
        details: error.message 
      });
    }
  },

  // =============================================
  // MÉTODOS DE CONSULTA (GET)
  // =============================================

  // Obtener todas las inspecciones
  getAll: async (req, res) => {
    try {
      const inspecciones = await InspeccionModel.getAll();
      
      res.json({ 
        success: true, 
        data: inspecciones,
        total: inspecciones.length,
        message: 'Inspecciones obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error en getAll inspecciones:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener inspecciones',
        details: error.message 
      });
    }
  },

  // Obtener estadísticas de inspecciones
  getEstadisticas: async (req, res) => {
    try {
      const estadisticas = await InspeccionModel.getEstadisticas();
      
      res.json({ 
        success: true, 
        data: estadisticas,
        message: 'Estadísticas obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error en getEstadisticas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener estadísticas',
        details: error.message 
      });
    }
  },

  // Obtener una inspección por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID de inspección inválido' 
        });
      }

      const inspeccion = await InspeccionModel.getById(id);
      
      if (!inspeccion) {
        return res.status(404).json({ 
          success: false, 
          error: 'Inspección no encontrada' 
        });
      }

      res.json({ 
        success: true, 
        data: inspeccion,
        message: 'Inspección obtenida exitosamente'
      });
    } catch (error) {
      console.error('Error en getById inspección:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener inspección',
        details: error.message 
      });
    }
  },

  // Obtener inspecciones por expediente
  getByExpediente: async (req, res) => {
    try {
      const { id_expediente } = req.params;
      
      if (!id_expediente || isNaN(id_expediente)) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID de expediente inválido' 
        });
      }

      const inspecciones = await InspeccionModel.getByExpediente(id_expediente);
      
      res.json({ 
        success: true, 
        data: inspecciones,
        total: inspecciones.length,
        message: inspecciones.length > 0 
          ? 'Inspecciones del expediente obtenidas exitosamente' 
          : 'No se encontraron inspecciones para este expediente'
      });
    } catch (error) {
      console.error('Error en getByExpediente:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener inspecciones del expediente',
        details: error.message 
      });
    }
  },

  // Obtener datos del emprendimiento para preparar inspección
  getEmprendimientoData: async (req, res) => {
    try {
      const { id_expediente } = req.params;
      
      if (!id_expediente || isNaN(id_expediente)) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID de expediente inválido' 
        });
      }

      const data = await InspeccionModel.getEmprendimientoData(id_expediente);
      
      if (!data) {
        return res.status(404).json({ 
          success: false, 
          error: 'Emprendimiento no encontrado' 
        });
      }

      res.json({ 
        success: true, 
        data,
        message: 'Datos del emprendimiento obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error en getEmprendimientoData:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener datos del emprendimiento',
        details: error.message 
      });
    }
  },

  // =============================================
  // MÉTODOS DE ESCRITURA (POST/PUT)
  // =============================================

  // Crear nueva inspección básica
  create: async (req, res) => {
    try {
      const { id_codigo_exp, id_tipo_insp_clas, estatus_inspeccion } = req.body;
      
      // Validaciones
      if (!id_codigo_exp) {
        return res.status(400).json({ 
          success: false, 
          error: 'El ID del expediente es requerido' 
        });
      }

      if (id_tipo_insp_clas && ![1, 2, 3, 4].includes(id_tipo_insp_clas)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Tipo de inspección inválido. Debe ser: 1=Inicial, 2=Reinspección, 3=Periódica, 4=Seguimiento' 
        });
      }

      const estatusPermitidos = ['Pendiente', 'En Proceso', 'Completada', 'Aprobado', 'Aprobado con observaciones', 'Rechazado'];
      if (estatus_inspeccion && !estatusPermitidos.includes(estatus_inspeccion)) {
        return res.status(400).json({ 
          success: false, 
          error: `Estatus inválido. Permitidos: ${estatusPermitidos.join(', ')}` 
        });
      }

      const inspeccion = await InspeccionModel.create(req.body);
      
      res.status(201).json({ 
        success: true, 
        data: inspeccion, 
        message: 'Inspección creada exitosamente' 
      });
    } catch (error) {
      console.error('Error en create inspección:', error);
      
      // Manejar errores específicos de PostgreSQL
      if (error.code === '23503') {
        return res.status(400).json({ 
          success: false, 
          error: 'El expediente especificado no existe' 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Error al crear inspección',
        details: error.message 
      });
    }
  },

  // Crear inspección completa con todas las tablas relacionadas
  createFull: async (req, res) => {
    try {
      const data = req.body;
      
      // Validaciones básicas
      if (!data.id_codigo_exp) {
        return res.status(400).json({ 
          success: false, 
          error: 'El ID del expediente es requerido' 
        });
      }

      // Validar si ya existe una inspección para este expediente
      const inspeccionesExistentes = await InspeccionModel.getByExpediente(data.id_codigo_exp);
      const inspeccionPendiente = inspeccionesExistentes.find(i => i.estatus_inspeccion === 'Pendiente');
      
      if (inspeccionPendiente && !data.id_inspeccion) {
        return res.status(409).json({ 
          success: false, 
          error: 'Ya existe una inspección pendiente para este expediente',
          data: { id_inspeccion: inspeccionPendiente.id_inspeccion }
        });
      }

      const inspeccion = await InspeccionModel.createFull(data);
      
      res.status(201).json({ 
        success: true, 
        data: inspeccion, 
        message: 'Inspección completa creada exitosamente' 
      });
    } catch (error) {
      console.error('Error en createFull:', error);
      
      if (error.code === '23503') {
        return res.status(400).json({ 
          success: false, 
          error: 'Referencia inválida: verifique que el expediente exista' 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Error al crear inspección completa',
        details: error.message 
      });
    }
  },

  // Actualizar inspección existente
  update: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID de inspección inválido' 
        });
      }

      // Verificar que la inspección existe
      const inspeccionExistente = await InspeccionModel.getById(id);
      if (!inspeccionExistente) {
        return res.status(404).json({ 
          success: false, 
          error: 'Inspección no encontrada' 
        });
      }

      const inspeccion = await InspeccionModel.update(id, req.body);
      
      res.json({ 
        success: true, 
        data: inspeccion, 
        message: 'Inspección actualizada exitosamente' 
      });
    } catch (error) {
      console.error('Error en update inspección:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al actualizar inspección',
        details: error.message 
      });
    }
  },

  // Actualizar inspección completa (reemplaza todos los datos)
  updateFull: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID de inspección inválido' 
        });
      }

      // Verificar que la inspección existe
      const inspeccionExistente = await InspeccionModel.getById(id);
      if (!inspeccionExistente) {
        return res.status(404).json({ 
          success: false, 
          error: 'Inspección no encontrada' 
        });
      }

      const inspeccion = await InspeccionModel.updateFull(id, req.body);
      
      res.json({ 
        success: true, 
        data: inspeccion, 
        message: 'Inspección completa actualizada exitosamente' 
      });
    } catch (error) {
      console.error('Error en updateFull:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al actualizar inspección completa',
        details: error.message 
      });
    }
  },

  // Guardar resultados de inspección (formulario dinámico)
  saveInspectionResults: async (req, res) => {
    try {
      const { id } = req.params;
      const { results } = req.body;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID de inspección inválido' 
        });
      }

      if (!results) {
        return res.status(400).json({ 
          success: false, 
          error: 'Los resultados son requeridos' 
        });
      }

      // Verificar que la inspección existe
      const inspeccionExistente = await InspeccionModel.getById(id);
      if (!inspeccionExistente) {
        return res.status(404).json({ 
          success: false, 
          error: 'Inspección no encontrada' 
        });
      }

      const inspeccion = await InspeccionModel.saveInspectionResults(id, results);
      
      res.json({ 
        success: true, 
        data: inspeccion, 
        message: 'Resultados de inspección guardados exitosamente' 
      });
    } catch (error) {
      console.error('Error en saveInspectionResults:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al guardar resultados de inspección',
        details: error.message 
      });
    }
  },

  // Eliminar inspección
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID de inspección inválido' 
        });
      }

      // Verificar que la inspección existe
      const inspeccionExistente = await InspeccionModel.getById(id);
      if (!inspeccionExistente) {
        return res.status(404).json({ 
          success: false, 
          error: 'Inspección no encontrada' 
        });
      }

      // Verificar que no esté aprobada para evitar eliminación accidental
      if (inspeccionExistente.estatus_inspeccion === 'Aprobado') {
        return res.status(400).json({ 
          success: false, 
          error: 'No se puede eliminar una inspección aprobada' 
        });
      }

      const result = await InspeccionModel.delete(id);
      
      res.json({ 
        success: true, 
        data: result,
        message: 'Inspección eliminada exitosamente' 
      });
    } catch (error) {
      console.error('Error en delete inspección:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al eliminar inspección',
        details: error.message 
      });
    }
  },

  // Descargar informe PDF de inspección
  downloadInforme: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de inspección inválido',
        });
      }

      const inspeccion = await InspeccionModel.getBestForInforme(id);
      if (!inspeccion) {
        return res.status(404).json({
          success: false,
          error: 'Inspección no encontrada',
        });
      }

      const PDFService = require('../services/pdfService');
      const pool = require('../config/db');
      const presidente = await PDFService.obtenerNombrePresidente(pool);
      const buffer = await PDFService.generarPDFInformeInspeccion({
        ...inspeccion,
        presidente_nombre: presidente,
      });

      const codigo = (inspeccion.codigo_expediente || `EXP-${inspeccion.id_codigo_exp || id}`)
        .toString()
        .replace(/[^\w.-]+/g, '_');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=informe_inspeccion_${codigo}_${id}.pdf`
      );
      return res.send(buffer);
    } catch (error) {
      console.error('Error en downloadInforme inspección:', error);
      res.status(500).json({
        success: false,
        error: 'Error al generar el informe de inspección',
        details: error.message,
      });
    }
  }
};

module.exports = inspeccionController;