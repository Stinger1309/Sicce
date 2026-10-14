const fs = require('fs');
const RespaldoModel = require('../models/respaldoModel');
const {
  registrarAuditoria,
  obtenerUsuarioDesdeRequest,
  obtenerIp,
} = require('../services/auditoriaService');
const {
  INTERVALO_DIAS,
  ejecutarSiCorresponde,
} = require('../services/respaldoScheduler');

const respaldoController = {
  /** Exportación manual: genera y descarga el SQL */
  generar: async (req, res) => {
    try {
      await RespaldoModel.ensureSchema();
      const usuario = obtenerUsuarioDesdeRequest(req);
      const { buffer, nombreArchivo, metodo } = await RespaldoModel.generarRespaldo();

      // Guarda copia en servidor + historial
      const { registro } = await RespaldoModel.guardarEnDisco({
        buffer,
        nombreArchivo,
        metodo,
        origen: 'manual',
        id_usuario: usuario.id_usuario,
        usuario_nombre: usuario.usuario_nombre || 'Usuario',
      });

      await registrarAuditoria({
        ...usuario,
        modulo: 'Respaldo BD',
        accion: 'exportar',
        descripcion: `Respaldo manual: ${nombreArchivo} (${(buffer.length / 1024).toFixed(1)} KB) vía ${metodo}`,
        ip_address: obtenerIp(req),
        user_agent: req.headers['user-agent'],
      });

      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('X-Backup-Method', metodo);
      res.setHeader('X-Backup-Id', String(registro?.id_respaldo || ''));
      return res.send(buffer);
    } catch (error) {
      console.error('Error en respaldo.generar:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  historial: async (req, res) => {
    try {
      await RespaldoModel.ensureSchema();
      const limit = parseInt(req.query.limit || 50, 10);
      const data = await RespaldoModel.getHistorial(limit);
      res.json({
        success: true,
        data,
        message: 'Historial de respaldos obtenido',
      });
    } catch (error) {
      console.error('Error en respaldo.historial:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  tablas: async (req, res) => {
    try {
      const tablas = await RespaldoModel.listarTablas();
      res.json({ success: true, data: tablas });
    } catch (error) {
      console.error('Error en respaldo.tablas:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /** Estado del respaldo automático cada N días */
  programacion: async (req, res) => {
    try {
      await RespaldoModel.ensureSchema();
      const data = await RespaldoModel.getEstadoProgramacion(INTERVALO_DIAS);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error en respaldo.programacion:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /** Descarga un respaldo previamente guardado en disco */
  descargar: async (req, res) => {
    try {
      const registro = await RespaldoModel.getById(req.params.id);
      if (!registro) {
        return res.status(404).json({ success: false, error: 'Respaldo no encontrado' });
      }
      const ruta = RespaldoModel.resolverRutaArchivo(registro);
      if (!ruta) {
        return res.status(404).json({
          success: false,
          error: 'El archivo ya no está disponible en el servidor. Genere un nuevo respaldo.',
        });
      }

      const buffer = fs.readFileSync(ruta);
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${registro.nombre_archivo}`
      );
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (error) {
      console.error('Error en respaldo.descargar:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /** Fuerza un ciclo del scheduler (útil para pruebas / admin) */
  ejecutarAutomatico: async (req, res) => {
    try {
      const result = await ejecutarSiCorresponde('manual_trigger');
      if (result.error) {
        return res.status(500).json({ success: false, error: result.error });
      }
      res.json({
        success: true,
        data: result,
        message: result.skipped
          ? 'No se ejecutó: aún no toca el intervalo de 15 días (o hay uno en curso).'
          : 'Respaldo automático ejecutado y guardado en el servidor.',
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

module.exports = respaldoController;
