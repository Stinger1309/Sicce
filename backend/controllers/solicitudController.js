// controllers/solicitudController.js
const SolicitudModel = require('../models/solicitudModel');

function errorMsg(error) {
  return (
    error?.message ||
    error?.detail ||
    error?.code ||
    (typeof error === 'string' ? error : null) ||
    'Error desconocido en solicitudes'
  );
}

const solicitudController = {

  // GET /api/solicitud/aprobadas
  getAprobadas: async (req, res) => {
    try {
      const solicitudes = await SolicitudModel.getAprobadas();
      res.json({
        success: true,
        data: solicitudes,
        count: solicitudes.length,
        message: 'Solicitudes aprobadas obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error en getAprobadas:', error);
      res.status(500).json({
        success: false,
        error: errorMsg(error)
      });
    }
  },

  // GET /api/solicitud
  getAll: async (req, res) => {
    try {
      const solicitudes = await SolicitudModel.getAll();
      res.json({
        success: true,
        data: solicitudes,
        message: 'Solicitudes obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error en getAll:', error);
      res.status(500).json({
        success: false,
        error: errorMsg(error)
      });
    }
  },

  // GET /api/solicitud/cedula/:cedula - CORREGIDO
  getByCedula: async (req, res) => {
    try {
      const { cedula } = req.params;
      
      // Validar que la cédula no esté vacía
      if (!cedula || cedula.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Cédula no proporcionada'
        });
      }
      
      const solicitudes = await SolicitudModel.getByCedula(cedula.trim());
      
      res.json({
        success: true,
        data: solicitudes,
        count: solicitudes.length
      });
    } catch (error) {
      console.error('Error en getByCedula:', error);
      res.status(500).json({
        success: false,
        error: errorMsg(error)
      });
    }
  },

  // GET /api/solicitud/puede-crear/:cedula
  puedeCrear: async (req, res) => {
    try {
      const { cedula } = req.params;
      if (!cedula || String(cedula).trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Cédula no proporcionada',
        });
      }
      const evaluacion = await SolicitudModel.evaluarNuevaSolicitud(cedula.trim());
      res.json({
        success: true,
        data: evaluacion,
      });
    } catch (error) {
      console.error('Error en puedeCrear:', error);
      res.status(500).json({
        success: false,
        error: errorMsg(error),
      });
    }
  },

  // GET /api/solicitud/:id
  getById: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de solicitud inválido'
        });
      }

      const solicitud = await SolicitudModel.getById(id);
      if (!solicitud) {
        return res.status(404).json({
          success: false,
          error: 'Solicitud no encontrada'
        });
      }

      res.json({
        success: true,
        data: solicitud
      });
    } catch (error) {
      console.error('Error en getById:', error);
      res.status(500).json({
        success: false,
        error: errorMsg(error)
      });
    }
  },

  // POST /api/solicitud
  create: async (req, res) => {
    try {
      const cedula = req.body?.cedula_persona;
      const evaluacion = await SolicitudModel.evaluarNuevaSolicitud(cedula);
      if (!evaluacion.puede) {
        return res.status(409).json({
          success: false,
          error: evaluacion.motivo,
          code: 'CREDITO_ABIERTO',
        });
      }

      const solicitud = await SolicitudModel.create(req.body);
      res.status(201).json({
        success: true,
        data: solicitud,
        message: 'Solicitud creada exitosamente'
      });
    } catch (error) {
      console.error('Error en create:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // PUT /api/solicitud/:id
  update: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validar que el ID sea un número
      const id_solicitud = parseInt(id);
      if (isNaN(id_solicitud)) {
        return res.status(400).json({
          success: false,
          error: 'ID de solicitud inválido'
        });
      }
      
      const solicitud = await SolicitudModel.update(id_solicitud, req.body);
      
      if (!solicitud) {
        return res.status(404).json({
          success: false,
          error: 'Solicitud no encontrada'
        });
      }
      
      res.json({
        success: true,
        data: solicitud,
        message: 'Solicitud actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error en update:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // PUT /api/solicitud/:id/estatus - CORREGIDO
  updateEstatus: async (req, res) => {
    try {
      const { id } = req.params;
      let { estatus, motivo_rechazo, cita } = req.body;
      
      // Validar que el ID sea un número
      const id_solicitud = parseInt(id);
      if (isNaN(id_solicitud)) {
        return res.status(400).json({
          success: false,
          error: 'ID de solicitud inválido'
        });
      }
      
      // Validar que el estatus sea válido
      const estatusPermitidos = ['Pendiente', 'Recibido', 'Pre-Aprobado', 'Rechazado', 'Incompleto'];
      if (!estatusPermitidos.includes(estatus)) {
        return res.status(400).json({
          success: false,
          error: 'Estatus no válido. Los valores permitidos son: Pendiente, Recibido, Rechazado, Incompleto'
        });
      }

      // La pre-aprobación se registra como Recibido (se acepta Pre-Aprobado por compatibilidad)
      if (estatus === 'Pre-Aprobado') {
        estatus = 'Recibido';
      }
      const esRecibido = estatus === 'Recibido';
      
      // Si el estatus es Rechazado, validar que tenga motivo
      if (estatus === 'Rechazado' && (!motivo_rechazo || motivo_rechazo.trim() === '')) {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar un motivo de rechazo'
        });
      }

      // Recibido (pre-aprobación) requiere cita (inspector + fecha + hora)
      if (esRecibido) {
        if (!cita?.id_inspector || !cita?.fecha_cita || !cita?.hora_inicio) {
          return res.status(400).json({
            success: false,
            error: 'Para marcar como recibida debe asignar inspector, fecha y hora de la cita'
          });
        }
      }
      
      const solicitud = await SolicitudModel.cambiarEstatus(
        id_solicitud,
        estatus,
        motivo_rechazo,
        esRecibido ? cita?.id_inspector : null
      );
      
      if (!solicitud) {
        return res.status(404).json({
          success: false,
          error: 'Solicitud no encontrada'
        });
      }

      let citaCreada = null;
      if (esRecibido && cita) {
        const CitaModel = require('../models/citaModel');
        const NotificacionModel = require('../models/notificacionModel');
        const pool = require('../config/db');

        const det = await pool.query(
          `SELECT s.cedula_persona, s.solicitud, s.monto_solicitado,
                  CONCAT(p.nombres, ' ', p.apellidos) AS nombre_completo
           FROM solicitud s
           LEFT JOIN persona p ON p.cedula = s.cedula_persona
           WHERE s.id_solicitud = $1`,
          [id_solicitud]
        );
        const info = det.rows[0] || {};

        citaCreada = await CitaModel.create({
          id_solicitud,
          id_expediente: null,
          id_inspector: parseInt(cita.id_inspector, 10),
          cedula_emprendedor: info.cedula_persona || null,
          titulo: `Atención pre-aprobación — Solicitud #${id_solicitud}`,
          descripcion:
            cita.descripcion ||
            `Pre-aprobación de crédito. Emprendedor: ${info.nombre_completo || info.cedula_persona || 'N/A'}. Monto: ${info.monto_solicitado || 'N/A'}`,
          fecha_cita: cita.fecha_cita,
          hora_inicio: cita.hora_inicio,
          hora_fin: cita.hora_fin || null,
          created_by: parseInt(req.headers['x-user-id'], 10) || null
        });

        // Asegurar id_inspector en solicitud (además del guardado en cambiarEstatus)
        await SolicitudModel.asignarInspector(id_solicitud, cita.id_inspector);

        try {
          await NotificacionModel.create({
            id_usuario_destino: citaCreada.id_inspector,
            id_usuario_origen: parseInt(req.headers['x-user-id'], 10) || null,
            titulo: 'Nueva cita por pre-aprobación',
            mensaje: `Solicitud #${id_solicitud} — ${cita.fecha_cita} ${cita.hora_inicio}`,
            tipo: 'cita',
            modulo: 'citas',
            enlace: '/Citas'
          });
        } catch (_) { /* ignore */ }

        // Correo al emprendedor: pre-aprobación + recaudos + cita
        try {
          const emailService = require('../services/emailService');
          const RequisitosModel = require('../models/requisitosModel');

          const personaMail = await pool.query(
            `SELECT p.correo, p.nombres, p.apellidos, s.monto_solicitado
             FROM solicitud s
             INNER JOIN persona p ON p.cedula = s.cedula_persona
             WHERE s.id_solicitud = $1`,
            [id_solicitud]
          );
          const emprendedor = personaMail.rows[0];

          let requisitosLista = [];
          try {
            requisitosLista = await RequisitosModel.getAll();
          } catch (_) {
            requisitosLista = [];
          }

          const inspRow = await pool.query(
            `SELECT CONCAT(pi.nombres, ' ', pi.apellidos) AS inspector_nombre
             FROM usuario u
             LEFT JOIN persona pi ON pi.cedula = u.cedula_usuario
             WHERE u.id = $1`,
            [cita.id_inspector]
          );

          const formatFecha = (f) => {
            if (!f) return 'por confirmar';
            try {
              const d = f instanceof Date ? f : new Date(f);
              if (Number.isNaN(d.getTime())) return String(f);
              return d.toLocaleDateString('es-VE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'America/Caracas'
              });
            } catch {
              return String(f);
            }
          };

          const formatHora = (h) => {
            if (!h) return 'por confirmar';
            const s = String(h);
            return s.length >= 5 ? s.slice(0, 5) : s;
          };

          if (emprendedor?.correo) {
            await emailService.sendPreAprobacionCreditoEmail({
              email: emprendedor.correo,
              nombre: `${emprendedor.nombres || ''} ${emprendedor.apellidos || ''}`.trim(),
              numeroSolicitud: id_solicitud,
              monto: emprendedor.monto_solicitado,
              requisitos: requisitosLista,
              cita: {
                fecha: formatFecha(cita.fecha_cita || citaCreada.fecha_cita),
                hora: formatHora(cita.hora_inicio || citaCreada.hora_inicio),
                inspector: (inspRow.rows[0]?.inspector_nombre || '').trim() || null
              }
            });
          } else {
            console.warn(
              `⚠️ Solicitud #${id_solicitud}: no se envió correo de pre-aprobación (persona sin correo)`
            );
          }
        } catch (mailErr) {
          console.error('Error enviando correo de pre-aprobación:', mailErr.message);
        }
      }
      
      // Mensaje según el estatus
      let mensaje = '';
      if (esRecibido) {
        mensaje = 'Solicitud recibida, cita registrada y correo de notificación enviado';
      } else if (estatus === 'Rechazado') {
        mensaje = 'Solicitud rechazada exitosamente';
      } else {
        mensaje = 'Estatus actualizado exitosamente';
      }
      
      res.json({
        success: true,
        data: { ...solicitud, cita: citaCreada },
        message: mensaje
      });
    } catch (error) {
      console.error('Error en updateEstatus:', error);
      const code = error.message?.includes('ya tiene una cita') ? 409 : 500;
      res.status(code).json({
        success: false,
        error: error.message
      });
    }
  },

  // DELETE /api/solicitud/:id
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validar que el ID sea un número
      const id_solicitud = parseInt(id);
      if (isNaN(id_solicitud)) {
        return res.status(400).json({
          success: false,
          error: 'ID de solicitud inválido'
        });
      }
      
      const solicitud = await SolicitudModel.delete(id_solicitud);
      
      if (!solicitud) {
        return res.status(404).json({
          success: false,
          error: 'Solicitud no encontrada'
        });
      }
      
      res.json({
        success: true,
        message: 'Solicitud eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error en delete:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = solicitudController;