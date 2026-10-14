const AprobacionModel = require('../models/aprobacionModel');
const pool = require('../config/db');

const NORMALIZAR = (v) => String(v || '').trim().toLowerCase();

const esDecisionAprobada = (estatus) => {
  const e = NORMALIZAR(estatus);
  return e.includes('aprob') && !e.includes('rechaz');
};

const esDecisionRechazada = (estatus) => {
  const e = NORMALIZAR(estatus);
  return e.includes('rechaz');
};

const aprobacionController = {
  getAllExpedientes: async (req, res) => {
    try {
      const expedientes = await AprobacionModel.getAllExpedientes();
      res.json({
        success: true,
        data: expedientes,
        total: expedientes.length
      });
    } catch (error) {
      console.error('Error en getAllExpedientes:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener los expedientes: ' + error.message
      });
    }
  },

  getStatsExpedientes: async (req, res) => {
    try {
      const stats = await AprobacionModel.getStatsExpedientes();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error en getStatsExpedientes:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener estadísticas'
      });
    }
  },

  getExpedienteById: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de expediente inválido'
        });
      }

      const expediente = await AprobacionModel.getExpedienteById(parseInt(id));

      if (!expediente) {
        return res.status(404).json({
          success: false,
          error: 'Expediente no encontrado'
        });
      }

      res.json({
        success: true,
        data: expediente
      });
    } catch (error) {
      console.error('Error en getExpedienteById:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener el expediente: ' + error.message
      });
    }
  },

  verificarRequisitos: async (req, res) => {
    try {
      const {
        id_expediente,
        requisitos,
        observaciones,
        cedula_persona_id,
        seleccion_manejo,
        estatus_aprobacion,
        estatus_inspeccion,
        id_inspeccion,
        id_persona_banco
      } = req.body;

      if (!cedula_persona_id || cedula_persona_id === '') {
        return res.status(400).json({
          success: false,
          error: 'El campo cedula_persona_id es requerido'
        });
      }

      if (!id_expediente) {
        return res.status(400).json({
          success: false,
          error: 'El id_expediente es requerido'
        });
      }

      // Requisitos opcionales (ya verificados en Expediente). Si vienen, validar estructura.
      let requisitosFinales = Array.isArray(requisitos) ? requisitos : [];
      if (requisitosFinales.length > 0) {
        const requisitosValidos = requisitosFinales.every(
          (r) =>
            r &&
            (r.id_requisito !== undefined && r.id_requisito !== null && r.id_requisito !== '') &&
            r.nombre &&
            typeof r.verificado === 'boolean'
        );
        if (!requisitosValidos) {
          return res.status(400).json({
            success: false,
            error:
              'Estructura de requisitos inválida. Cada requisito debe tener id_requisito, nombre y verificado'
          });
        }
        // Forzar verificados (docs ya validados en Expediente)
        requisitosFinales = requisitosFinales.map((r) => ({
          ...r,
          verificado: true,
          estado_verificacion: 'verificado',
          observacion_no_valido: null
        }));
      } else {
        requisitosFinales = [
          {
            id_requisito: 1,
            nombre: 'Documentación verificada en Expediente',
            verificado: true,
            estado_verificacion: 'verificado',
            observacion_no_valido: null
          }
        ];
      }

      const decision = String(estatus_aprobacion || '').trim();
      const aprobado = esDecisionAprobada(decision);
      const rechazado = esDecisionRechazada(decision);
      const borrador = !aprobado && !rechazado;

      // Estatus de expediente/solicitud según decisión del presidente (NO por requisitos)
      let estatusFlujo = 'En aprobación';
      if (aprobado) estatusFlujo = 'Aprobado';
      if (rechazado) estatusFlujo = 'Rechazado';

      if (aprobado) {
        if (!seleccion_manejo) {
          return res.status(400).json({
            success: false,
            error: 'Debe seleccionar el tipo de manejo (Interno o Banco) al aprobar el crédito'
          });
        }
        if (!['Interno', 'Banco'].includes(seleccion_manejo)) {
          return res.status(400).json({
            success: false,
            error: 'El tipo de manejo debe ser "Interno" o "Banco"'
          });
        }
        if (seleccion_manejo === 'Banco' && !id_persona_banco) {
          return res.status(400).json({
            success: false,
            error: 'Debe seleccionar el banco al cual se direccionará el crédito'
          });
        }
      }

      if (seleccion_manejo && !['Interno', 'Banco'].includes(seleccion_manejo)) {
        return res.status(400).json({
          success: false,
          error: 'El tipo de manejo debe ser "Interno" o "Banco"'
        });
      }

      // id_inspeccion: solo IDs reales (nunca id_expediente)
      let idInspeccionSafe = id_inspeccion ? parseInt(id_inspeccion, 10) : null;
      if (Number.isNaN(idInspeccionSafe)) idInspeccionSafe = null;
      if (idInspeccionSafe && idInspeccionSafe === parseInt(id_expediente, 10)) {
        idInspeccionSafe = null;
      }

      const resultado = await AprobacionModel.verificarRequisitos({
        id_expediente: parseInt(id_expediente, 10),
        requisitos: requisitosFinales,
        estatus: estatusFlujo,
        cedula_persona_id,
        seleccion_manejo: aprobado ? seleccion_manejo : seleccion_manejo || null,
        observaciones: observaciones || '',
        id_inspeccion: idInspeccionSafe,
        estatus_aprobacion: decision || (borrador ? 'Pendiente' : estatusFlujo),
        estatus_inspeccion: estatus_inspeccion || null,
        id_persona_banco: aprobado && seleccion_manejo === 'Banco' ? id_persona_banco : (id_persona_banco || null)
      });

      // Correo de decisión final: evitar reenviar plantilla de pre-aprobación/cita
      if ((aprobado || rechazado) && cedula_persona_id) {
        try {
          const persona = await pool.query(
            `SELECT nombres, apellidos, correo FROM persona WHERE cedula = $1`,
            [cedula_persona_id]
          );
          const p = persona.rows[0];
          if (p?.correo) {
            console.log(
              `ℹ️ Decisión de crédito (${estatusFlujo}) para ${p.correo} — correo informativo omitido (plantilla de pre-aprobación no aplica)`
            );
          }
        } catch (_) { /* ignore */ }
      }

      res.json({
        success: true,
        data: resultado,
        id_credito_banco: resultado?.id_credito_banco || null,
        descargar_aval: Boolean(resultado?.descargar_aval),
        message: rechazado
          ? 'Crédito rechazado correctamente'
          : aprobado
            ? 'Crédito aprobado correctamente'
            : 'Progreso de aprobación guardado'
      });
    } catch (error) {
      console.error('Error en verificarRequisitos:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al guardar la aprobación'
      });
    }
  }
};

module.exports = aprobacionController;
