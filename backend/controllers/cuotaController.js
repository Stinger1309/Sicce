const CuotaModel = require('../models/cuotaModel');

const cuotaController = {
  // Obtener todos los contratos con sus cuotas
  async getAll(req, res) {
    try {
      await CuotaModel.actualizarEstadosMora();
      await CuotaModel.marcarContratosLegales();
      
      const contratos = await CuotaModel.getAll();
      
      const contratosConCuotas = await Promise.all(
        contratos.map(async (contrato) => {
          try {
            const cuotas = await CuotaModel.getCuotasByContratoId(contrato.id_contrato);
            return {
              ...contrato,
              cuotas: cuotas || []
            };
          } catch (error) {
            console.error(`Error obteniendo cuotas para contrato ${contrato.id_contrato}:`, error);
            return {
              ...contrato,
              cuotas: []
            };
          }
        })
      );
      
      res.json({ success: true, data: contratosConCuotas });
    } catch (error) {
      console.error('Error en getAll:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        details: 'Error al obtener los contratos'
      });
    }
  },

  // Obtener contratos por cédula de aprobación
async getByCedulaAprob(req, res) {
  try {
    const { id_cedula_aprob } = req.params;
    
    if (!id_cedula_aprob) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID de cédula de aprobación requerido' 
      });
    }
    
    // Actualizar estados de mora primero
    await CuotaModel.actualizarEstadosMora();
    await CuotaModel.marcarContratosLegales();
    
    // Obtener contratos por cédula
    const contratos = await CuotaModel.getByCedulaAprob(id_cedula_aprob);
    
    // Obtener cuotas para cada contrato
    const contratosConCuotas = await Promise.all(
      contratos.map(async (contrato) => {
        try {
          const cuotas = await CuotaModel.getCuotasByContratoId(contrato.id_contrato);
          return {
            ...contrato,
            cuotas: cuotas || []
          };
        } catch (error) {
          console.error(`Error obteniendo cuotas para contrato ${contrato.id_contrato}:`, error);
          return {
            ...contrato,
            cuotas: []
          };
        }
      })
    );
    
    res.json({ success: true, data: contratosConCuotas });
  } catch (error) {
    console.error('Error en getByCedulaAprob:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Error al obtener los contratos por cédula'
    });
  }
},

  // Obtener cuotas de un contrato específico
  async getCuotasByContrato(req, res) {
    try {
      const { id_contrato } = req.params;
      
      if (!id_contrato) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID de contrato requerido' 
        });
      }
      
      await CuotaModel.actualizarEstadosMora();
      const cuotas = await CuotaModel.getCuotasByContratoId(id_contrato);
      
      res.json({ success: true, data: cuotas });
    } catch (error) {
      console.error('Error en getCuotasByContrato:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Registrar pago de cuota
  async registrarPago(req, res) {
    try {
      const { id_cuota } = req.params;
      
      if (!id_cuota) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID de cuota requerido' 
        });
      }
      
      const {
        fecha_pagada,
        dias_mora_cuota,
        monto_morosidad,
        comprobante,
        metodo_pago,
        titular_cedula,
        titular_nombre,
        monto_pagado,
        referencia,
        referencia_pago,
        telefono_pago,
      } = req.body;
      
      if (!fecha_pagada) {
        return res.status(400).json({
          success: false,
          error: 'La fecha de pago es requerida'
        });
      }

      if (!comprobante) {
        return res.status(400).json({
          success: false,
          error: 'El comprobante de pago es obligatorio'
        });
      }
      
      const cuotaActualizada = await CuotaModel.registrarPago(id_cuota, {
        fecha_pagada,
        dias_mora_cuota: dias_mora_cuota || 0,
        monto_morosidad: monto_morosidad || '0',
        comprobante,
        metodo_pago,
        titular_cedula,
        titular_nombre,
        monto_pagado,
        referencia,
        referencia_pago,
        telefono_pago,
      });
      
      await CuotaModel.actualizarEstadosMora();
      
      const cuotasActualizadas = await CuotaModel.getCuotasByContratoId(
        cuotaActualizada.id_cuota_cont
      );
      
      res.json({ 
        success: true, 
        message: cuotaActualizada.mensaje || 'Pago registrado con cascada de cobro.',
        data: {
          cuota_pagada: cuotaActualizada,
          aplicacion_cascada: cuotaActualizada.aplicacion_cascada,
          deuda_restante: cuotaActualizada.deuda_restante,
          anticipos_capital: cuotaActualizada.anticipos_capital,
          todas_las_cuotas: cuotasActualizadas
        }
      });
      
    } catch (error) {
      console.error('Error en registrarPago:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message || 'Error al registrar el pago' 
      });
    }
  },

  async confirmarPago(req, res) {
    try {
      const { id_cuota } = req.params;
      const idUsuario = req.user?.id || req.body?.id_usuario || req.headers['x-user-id'];
      const idRol = Number(req.user?.id_rol_usu || req.body?.id_rol || req.headers['x-user-rol'] || 0);

      if (idRol !== 1 && idUsuario) {
        const PermisosModel = require('../models/permisosModel');
        const ok = await PermisosModel.verificarPermiso(idUsuario, 'pagos_cuota', 'verificar');
        if (!ok) {
          return res.status(403).json({
            success: false,
            error: 'No tiene permiso para verificar pagos de cuotas',
          });
        }
      } else if (idRol !== 1 && !idUsuario) {
        return res.status(403).json({
          success: false,
          error: 'No autorizado para verificar pagos',
        });
      }

      const cuota = await CuotaModel.confirmarPago(id_cuota);
      await CuotaModel.actualizarEstadosMora();
      await CuotaModel.marcarContratosLegales();
      const todas = await CuotaModel.getCuotasByContratoId(cuota.id_cuota_cont);
      res.json({
        success: true,
        message: 'Cuota confirmada como pagada',
        data: { cuota, todas_las_cuotas: todas }
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Generar cuotas para un contrato
  async generarCuotasManual(req, res) {
    try {
      const { id_contrato } = req.params;
      const configuracion = req.body;
      
      console.log('=== GENERANDO CUOTAS MANUALES (CONTROLLER) ===');
      console.log('ID Contrato:', id_contrato);
      console.log('Configuración recibida:', JSON.stringify(configuracion, null, 2));
      
      if (!id_contrato) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID de contrato requerido' 
        });
      }
      
      // Validar configuración
      if (!configuracion.cantidadCuotas || configuracion.cantidadCuotas <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cantidad de cuotas obligatorias inválida' 
        });
      }
      
      if (!configuracion.fechaPrimeraCuota) {
        return res.status(400).json({ 
          success: false, 
          error: 'Fecha de primera cuota requerida' 
        });
      }
      
      const cuotasGeneradas = await CuotaModel.generarCuotasManual(id_contrato, configuracion);
      
      res.json({ 
        success: true, 
        message: `${cuotasGeneradas.length} cuotas generadas exitosamente`,
        data: cuotasGeneradas 
      });
      
    } catch (error) {
      console.error('Error en generarCuotasManual:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Actualizar todas las cuotas en mora
  async actualizarMora(req, res) {
    try {
      await CuotaModel.actualizarEstadosMora();
      const legales = await CuotaModel.marcarContratosLegales();
      res.json({ 
        success: true, 
        message: 'Estados de mora actualizados correctamente',
        contratos_legales: legales.length
      });
    } catch (error) {
      console.error('Error en actualizarMora:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Endpoint de prueba para recalcular gracias
  async testRecalculo(req, res) {
    try {
      const { id_contrato } = req.params;
      const resultado = await CuotaModel.recalcularCuotasGracia(id_contrato);
      const cuotas = await CuotaModel.getCuotasByContratoId(id_contrato);
      
      const resumen = {
        total_obligatorias: cuotas
          .filter(c => c.tipo_cuota === 'Obligatoria')
          .reduce((sum, c) => sum + parseFloat(c.monto_cuota), 0),
        total_gracias: cuotas
          .filter(c => c.tipo_cuota === 'Gracias')
          .reduce((sum, c) => sum + parseFloat(c.monto_cuota), 0),
        total_general: cuotas.reduce((sum, c) => sum + parseFloat(c.monto_cuota), 0),
        cuotas_actualizadas: resultado,
        todas_las_cuotas: cuotas.map(c => ({
          numero: c.num_cuota,
          tipo: c.tipo_cuota,
          monto: c.monto_cuota,
          estado: c.estado_cuota
        }))
      };
      
      res.json({ success: true, data: resumen });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /** PDF de cumplimiento de contrato finalizado */
  async descargarCumplimientoPdf(req, res) {
    try {
      const { id_contrato } = req.params;
      const datos = await CuotaModel.getDatosCumplimiento(id_contrato);
      if (!datos) {
        return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
      }
      if (String(datos.estatus).toLowerCase() !== 'finalizado') {
        const todasPagadas = (datos.cuotas || []).length > 0 &&
          (datos.cuotas || []).every((c) => c.estado_cuota === 'pagado');
        if (!todasPagadas) {
          return res.status(400).json({
            success: false,
            error: 'El PDF de cumplimiento solo está disponible cuando el contrato está Finalizado',
          });
        }
      }

      const PDFService = require('../services/pdfService');
      const pool = require('../config/db');
      const presidente = await PDFService.obtenerNombrePresidente(pool);
      const buffer = await PDFService.generarPDFCumplimientoContrato({
        ...datos,
        presidente_nombre: presidente,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=cumplimiento_${datos.numero_contrato || id_contrato}.pdf`
      );
      return res.send(buffer);
    } catch (error) {
      console.error('Error PDF cumplimiento:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

module.exports = cuotaController;