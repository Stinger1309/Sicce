const ContratoModel = require('../models/contratoModel');
const CuotaModel = require('../models/cuotaModel');
const DesembolsoModel = require('../models/desembolsoModel');

const contratoController = {
  // Obtener todas las aprobaciones con manejo interno
  async getAll(req, res) {
    try {
      const contratos = await ContratoModel.getAll();
      res.json({ success: true, data: contratos });
    } catch (error) {
      console.error('Error en getAll:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Registrar un nuevo contrato (proceso interno IADEY)
  async create(req, res) {
    try {
      const contratoData = req.body;
      
      const requiredFields = [
        'id_aprob', 'id_config', 'id_cedula_aprob', 'numero_contrato', 'moneda', 
        'monto_moneda', 'cambio', 'flat', 'interes', 
        'devolvimiento', 'numero_cuotas', 'inicio', 'cierre', 'foto_contrato'
      ];
      
      const missingFields = requiredFields.filter(field => !contratoData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}`
        });
      }

      const montoContrato = parseFloat(
        String(contratoData.monto_moneda).replace(/,/g, '.')
      );
      if (!Number.isFinite(montoContrato) || montoContrato <= 0) {
        return res.status(400).json({
          success: false,
          error: 'El monto del contrato debe ser un número mayor a 0'
        });
      }

      const montoSolRes = await ContratoModel.getMontoSolicitadoByAprobacion(
        contratoData.id_aprob
      );
      const montoSolicitado = montoSolRes != null ? parseFloat(montoSolRes) : null;
      if (
        Number.isFinite(montoSolicitado) &&
        montoContrato > montoSolicitado + 0.0001
      ) {
        return res.status(400).json({
          success: false,
          error: `El monto del contrato (${montoContrato}) no puede superar el monto solicitado (${montoSolicitado})`
        });
      }

      contratoData.estatus = 'Activo';

      const nuevoContrato = await ContratoModel.create(contratoData);

      const cantidadCuotas = parseInt(contratoData.numero_cuotas, 10) || 0;
      if (cantidadCuotas <= 0) {
        return res.status(400).json({
          success: false,
          error: 'El contrato debe tener un número de cuotas válido'
        });
      }

      const cuotas = await CuotaModel.generarCuotasManual(nuevoContrato.id_contrato, {
        cantidadCuotas,
        fechaPrimeraCuota: contratoData.inicio,
        frecuencia: contratoData.frecuencia_pago_contrato || 'mensual',
      });

      let desembolso = null;
      if (contratoData.desembolsado && contratoData.capture_desembolso) {
        desembolso = await DesembolsoModel.registrarComprobanteInterno({
          id_cont: nuevoContrato.id_contrato,
          capture_desembolso: contratoData.capture_desembolso,
          fecha_desembolso: contratoData.fecha_desembolso || new Date().toISOString().split('T')[0],
          cedula_desembolso: contratoData.id_cedula_aprob,
        });
      }

      const contratoFinal = await ContratoModel.getContratoById(nuevoContrato.id_contrato);
      
      res.status(201).json({
        success: true,
        message: 'Contrato registrado, cuotas generadas',
        data: contratoFinal || nuevoContrato,
        cuotas_generadas: cuotas?.length || 0,
        desembolso,
      });
    } catch (error) {
      console.error('Error en create:', error);
      
      if (error.code === '23505') {
        res.status(400).json({
          success: false,
          error: 'El número de contrato ya existe'
        });
      } else if (error.code === '23503') {
        res.status(400).json({
          success: false,
          error: 'La aprobación o configuración no existe'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Error al registrar el contrato'
        });
      }
    }
  },

  // Obtener el último número de contrato
  async getLastContractNumber(req, res) {
    try {
      const lastContract = await ContratoModel.getLastContractNumber();
      res.json({ success: true, data: lastContract });
    } catch (error) {
      console.error('Error en getLastContractNumber:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getByCedula(req, res) {
  try {
    const { cedula } = req.params;
    
    if (!cedula) {
      return res.status(400).json({
        success: false,
        error: 'La cédula es requerida'
      });
    }

    const contratos = await ContratoModel.getByCedula(cedula);
    
    res.json({
      success: true,
      data: contratos
    });
  } catch (error) {
    console.error('Error en getByCedula:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener los contratos por cédula'
    });
  }
},

  // Obtener un contrato por ID de aprobación
  async getById(req, res) {
    try {
      const { id } = req.params;
      const contrato = await ContratoModel.getById(id);
      
      if (!contrato) {
        return res.status(404).json({
          success: false,
          error: 'Contrato no encontrado'
        });
      }
      
      res.json({ success: true, data: contrato });
    } catch (error) {
      console.error('Error en getById:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

// Actualizar estatus del contrato
async updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { estatus, cedula_usuario, nombre_rol } = req.body;

    if (!estatus) {
      return res.status(400).json({
        success: false,
        error: 'El estatus es requerido'
      });
    }

    const allowedStatuses = [
      'Activo',
      'Pendiente por aceptar',
      'Pendiente por desembolso',
      'Pendiente por confirmar desembolso',
      'Esperando aceptar desembolso', // alias legado
      'Esperando contrato',
      'En espera de cuotas',
      'Cancelado',
      'Finalizado',
      'Terminado',
      'Legal'
    ];
    
    if (!allowedStatuses.includes(estatus)) {
      return res.status(400).json({
        success: false,
        error: `Estatus no válido. Estatus permitidos: ${allowedStatuses.join(', ')}`
      });
    }

    // Normalizar alias legado
    let estatusFinal = estatus;
    if (estatus === 'Esperando aceptar desembolso') {
      estatusFinal = 'Pendiente por confirmar desembolso';
    }

    const contratoExistente = await ContratoModel.getById(id);
    if (!contratoExistente) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    const currentStatus = contratoExistente.estatus;
    const currentNorm =
      currentStatus === 'Esperando aceptar desembolso' ||
      currentStatus === 'esperando aceptar desembolso'
        ? 'Pendiente por confirmar desembolso'
        : currentStatus;
    
    const validTransitions = {
      'Esperando contrato': ['Activo', 'Pendiente por aceptar', 'Cancelado'],
      'Pendiente por aceptar': ['Activo', 'Pendiente por desembolso', 'Cancelado'],
      'Pendiente por desembolso': ['Activo', 'Pendiente por confirmar desembolso', 'Cancelado'],
      'Pendiente por confirmar desembolso': ['Activo', 'Pendiente por desembolso', 'Cancelado'],
      'Esperando aceptar desembolso': ['Activo', 'Pendiente por desembolso', 'Cancelado'],
      'esperando aceptar desembolso': ['Activo', 'Pendiente por desembolso', 'Cancelado'],
      'En espera de cuotas': ['Activo', 'Finalizado', 'Legal', 'Cancelado'],
      'Activo': ['Finalizado', 'Legal', 'Cancelado'],
      'Finalizado': ['Cancelado'],
      'Terminado': ['Cancelado'],
      'Legal': ['Finalizado', 'Cancelado'],
      'Cancelado': []
    };

    const allowedNext = validTransitions[currentStatus] || validTransitions[currentNorm] || null;
    if (allowedNext && !allowedNext.includes(estatus) && !allowedNext.includes(estatusFinal)) {
      return res.status(400).json({
        success: false,
        error: `No se puede cambiar de "${currentStatus}" a "${estatus}". Transiciones válidas: ${allowedNext.join(', ') || 'ninguna'}`
      });
    }

    // Aceptar / rechazar (legado): ya no forma parte del flujo interno IADEY
    const esDecisionEmprendedor =
      currentStatus === 'Pendiente por aceptar' &&
      (estatus === 'Pendiente por desembolso' || estatus === 'Cancelado');

    if (esDecisionEmprendedor) {
      return res.status(403).json({
        success: false,
        error: 'El contrato se registra de forma interna. El emprendedor no acepta ni rechaza el contrato.'
      });
    }

    const contratoActualizado = await ContratoModel.updateStatus(id, estatusFinal);

    res.json({
      success: true,
      message: `Estatus actualizado a "${estatusFinal}" exitosamente`,
      data: contratoActualizado
    });
  } catch (error) {
    console.error('Error en updateStatus:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al actualizar el estatus del contrato'
    });
  }
},

  // Realizar desembolso
  async realizarDesembolso(req, res) {
    try {
      const desembolsoData = req.body;
      
      // Validar campos requeridos
      if (!desembolsoData.id_cont) {
        return res.status(400).json({
          success: false,
          error: 'El ID del contrato es requerido'
        });
      }
      
      if (!desembolsoData.capture_desembolso) {
        return res.status(400).json({
          success: false,
          error: 'La captura del comprobante es requerida'
        });
      }
      
      if (!desembolsoData.fecha_desembolso) {
        return res.status(400).json({
          success: false,
          error: 'La fecha de desembolso es requerida'
        });
      }
      
      // Obtener el contrato
      const contrato = await ContratoModel.getById(desembolsoData.id_cont);
      
      if (!contrato) {
        return res.status(404).json({
          success: false,
          error: `No se encontró un contrato para la aprobación #${desembolsoData.id_cont}`
        });
      }
      
      // Verificar estado del contrato
      if (contrato.estatus !== 'Pendiente por desembolso') {
        return res.status(400).json({
          success: false,
          error: `El contrato debe estar en estado "Pendiente por desembolso". Estado actual: ${contrato.estatus}`
        });
      }
      
      // Crear el desembolso
      const desembolso = await ContratoModel.crearDesembolso({
        id_cont: contrato.id_contrato,
        capture_desembolso: desembolsoData.capture_desembolso,
        fecha_desembolso: desembolsoData.fecha_desembolso,
        estatus_desembolso: desembolsoData.estatus_desembolso || 'pendiente por confirmar'
      });
      
      res.json({
        success: true,
        message: 'Desembolso registrado exitosamente',
        data: desembolso
      });
      
    } catch (error) {
      console.error('Error en realizarDesembolso:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al realizar el desembolso'
      });
    }
  },

  // Confirmar pago de desembolso
  async confirmarPago(req, res) {
    try {
      const { id } = req.params;
      const { fecha_confirmacion, observaciones_pago, referencia_pago } = req.body;

      if (!fecha_confirmacion) {
        return res.status(400).json({
          success: false,
          error: 'La fecha de confirmación es requerida'
        });
      }

      // Verificar que el desembolso existe
      const desembolsoExistente = await ContratoModel.getDesembolsoById(id);
      if (!desembolsoExistente) {
        return res.status(404).json({
          success: false,
          error: 'Desembolso no encontrado'
        });
      }

      // Verificar que el desembolso está en estado "Pendiente"
      if (desembolsoExistente.estatus_desembolso !== 'pendiente por confirmar') {
        return res.status(400).json({
          success: false,
          error: `El desembolso debe estar en estado "pendiente por confirmar" para confirmar el pago. Estado actual: ${desembolsoExistente.estatus_desembolso}`
        });
      }

      const pagoData = {
        fecha_confirmacion,
        observaciones_pago: observaciones_pago || null,
        referencia_pago: referencia_pago || null,
        estatus_desembolso: 'confirmado'
      };

      const desembolsoActualizado = await ContratoModel.confirmarPagoDesembolso(id, pagoData);

      res.json({
        success: true,
        message: 'Pago confirmado exitosamente',
        data: desembolsoActualizado
      });
    } catch (error) {
      console.error('Error en confirmarPago:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al confirmar el pago'
      });
    }
  },

  // Obtener desembolsos por contrato
  async getDesembolsosByContrato(req, res) {
    try {
      const { id } = req.params;
      const desembolsos = await ContratoModel.getDesembolsosByContrato(id);
      
      res.json({
        success: true,
        data: desembolsos
      });
    } catch (error) {
      console.error('Error en getDesembolsosByContrato:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener los desembolsos'
      });
    }
  },

  async registrarDesembolsoInterno(req, res) {
    try {
      const {
        id_cont,
        capture_desembolso,
        fecha_desembolso,
        cedula_desembolso,
      } = req.body;

      if (!id_cont) {
        return res.status(400).json({
          success: false,
          error: 'El ID del contrato es requerido',
        });
      }
      if (!capture_desembolso) {
        return res.status(400).json({
          success: false,
          error: 'El comprobante de desembolso es requerido',
        });
      }

      const desembolso = await DesembolsoModel.registrarComprobanteInterno({
        id_cont,
        capture_desembolso,
        fecha_desembolso: fecha_desembolso || new Date().toISOString().split('T')[0],
        cedula_desembolso,
      });

      res.json({
        success: true,
        message: 'Comprobante de desembolso registrado',
        data: desembolso,
      });
    } catch (error) {
      console.error('Error en registrarDesembolsoInterno:', error);
      const msg = error.message || 'Error al registrar el desembolso';
      const isClient =
        msg.includes('ya tiene') ||
        msg.includes('no encontrado') ||
        msg.includes('requerido');
      res.status(isClient ? 400 : 500).json({ success: false, error: msg });
    }
  }
};

module.exports = contratoController;