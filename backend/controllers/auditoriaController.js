const AuditoriaModel = require('../models/auditoriaModel');
const { registrarAuditoria, obtenerUsuarioDesdeRequest, obtenerIp } = require('../services/auditoriaService');
const exportService = require('../services/exportService');

const auditoriaController = {

  getAll: async (req, res) => {
    try {
      const {
        modulo,
        accion,
        id_usuario,
        desde,
        hasta,
        busqueda,
        limit = 100,
        offset = 0
      } = req.query;

      const result = await AuditoriaModel.getAll({
        modulo,
        accion,
        id_usuario: id_usuario ? parseInt(id_usuario, 10) : undefined,
        desde,
        hasta,
        busqueda,
        limit: Math.min(parseInt(limit, 10) || 100, 1000),
        offset: parseInt(offset, 10) || 0
      });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        message: 'Registros de auditoría obtenidos'
      });
    } catch (error) {
      console.error('Error en auditoria.getAll:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const registro = await AuditoriaModel.getById(req.params.id);
      if (!registro) {
        return res.status(404).json({ success: false, error: 'Registro no encontrado' });
      }
      res.json({ success: true, data: registro });
    } catch (error) {
      console.error('Error en auditoria.getById:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getFiltros: async (req, res) => {
    try {
      const [modulos, acciones] = await Promise.all([
        AuditoriaModel.getModulos(),
        AuditoriaModel.getAcciones()
      ]);
      res.json({ success: true, data: { modulos, acciones } });
    } catch (error) {
      console.error('Error en auditoria.getFiltros:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getEstadisticas: async (req, res) => {
    try {
      const stats = await AuditoriaModel.getEstadisticas();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error en auditoria.getEstadisticas:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const usuario = obtenerUsuarioDesdeRequest(req);
      const registro = await AuditoriaModel.create({
        ...req.body,
        id_usuario: req.body.id_usuario || usuario.id_usuario,
        usuario_nombre: req.body.usuario_nombre || usuario.usuario_nombre,
        ip_address: req.body.ip_address || obtenerIp(req),
        user_agent: req.body.user_agent || req.headers['user-agent']
      });
      res.status(201).json({
        success: true,
        data: registro,
        message: 'Evento de auditoría registrado'
      });
    } catch (error) {
      console.error('Error en auditoria.create:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  limpiar: async (req, res) => {
    try {
      const dias = parseInt(req.body.dias || req.query.dias || 90, 10);
      const eliminados = await AuditoriaModel.limpiarAntiguos(dias);
      const usuario = obtenerUsuarioDesdeRequest(req);

      await registrarAuditoria({
        ...usuario,
        modulo: 'Auditoría',
        accion: 'limpiar',
        descripcion: `Limpieza de registros anteriores a ${dias} días. Eliminados: ${eliminados}`,
        ip_address: obtenerIp(req),
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: { eliminados, dias },
        message: `Se eliminaron ${eliminados} registros antiguos`
      });
    } catch (error) {
      console.error('Error en auditoria.limpiar:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  exportar: async (req, res) => {
    try {
      const formato = (req.query.formato || req.body.formato || 'excel').toLowerCase();
      const filtros = {
        modulo: req.query.modulo || req.body.modulo,
        accion: req.query.accion || req.body.accion,
        id_usuario: req.query.id_usuario || req.body.id_usuario,
        desde: req.query.desde || req.body.desde,
        hasta: req.query.hasta || req.body.hasta,
        busqueda: req.query.busqueda || req.body.busqueda,
        limit: 5000,
        offset: 0
      };

      const result = await AuditoriaModel.getAll(filtros);
      const columns = [
        { key: 'id_auditoria', label: 'ID' },
        { key: 'created_at', label: 'Fecha' },
        { key: 'nombre_usuario', label: 'Usuario' },
        { key: 'modulo', label: 'Módulo' },
        { key: 'accion', label: 'Acción' },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'tabla_afectada', label: 'Tabla' },
        { key: 'registro_id', label: 'ID Registro' },
        { key: 'ip_address', label: 'IP' }
      ];

      const usuario = obtenerUsuarioDesdeRequest(req);
      await registrarAuditoria({
        ...usuario,
        modulo: 'Auditoría',
        accion: 'exportar',
        descripcion: `Exportación de auditoría a ${formato.toUpperCase()} (${result.data.length} registros)`,
        ip_address: obtenerIp(req),
        user_agent: req.headers['user-agent']
      });

      if (formato === 'pdf') {
        const buffer = await exportService.generarPDF({
          titulo: 'Auditoría del Sistema',
          subtitulo: `IADEY — ${new Date().toLocaleString('es-VE')}`,
          columns,
          rows: result.data
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=auditoria_${Date.now()}.pdf`);
        return res.send(buffer);
      }

      const buffer = await exportService.generarExcel({
        titulo: 'Auditoría',
        sheetName: 'Auditoría',
        columns,
        rows: result.data
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=auditoria_${Date.now()}.xlsx`);
      return res.send(buffer);
    } catch (error) {
      console.error('Error en auditoria.exportar:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = auditoriaController;
