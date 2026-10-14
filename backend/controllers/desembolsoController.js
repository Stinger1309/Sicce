const DesembolsoModel = require('../models/desembolsoModel');

const desembolsoController = {
    // Obtener todos los desembolsos
    async getAll(req, res) {
        try {
            const desembolsos = await DesembolsoModel.getAll();
            res.json({ 
                success: true, 
                data: desembolsos 
            });
        } catch (error) {
            console.error('Error en getAll:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    },

    // Obtener desembolsos por cédula
    async getByCedula(req, res) {
        try {
            const { cedula } = req.params;
            
            if (!cedula) {
                return res.status(400).json({
                    success: false,
                    error: 'La cédula es requerida'
                });
            }

            const desembolsos = await DesembolsoModel.getByCedula(cedula);
            
            res.json({
                success: true,
                data: desembolsos || []
            });
        } catch (error) {
            console.error('Error en getByCedula:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener desembolsos por cédula'
            });
        }
    },

    // Obtener contratos pendientes por desembolso
    async getContratosPendientes(req, res) {
        try {
            const contratos = await DesembolsoModel.getContratosPendientes();
            res.json({
                success: true,
                data: contratos
            });
        } catch (error) {
            console.error('Error en getContratosPendientes:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    // Verificar si un contrato tiene desembolso
    async verificarDesembolso(req, res) {
        try {
            const { id_cont } = req.params;
            const existe = await DesembolsoModel.verificarDesembolso(id_cont);
            res.json({
                success: true,
                existe: existe
            });
        } catch (error) {
            console.error('Error en verificarDesembolso:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    // Crear nuevo desembolso
    async create(req, res) {
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
            
            // Verificar que el contrato existe y obtener sus datos
            const contrato = await DesembolsoModel.getById(desembolsoData.id_cont);
            
            if (!contrato) {
                return res.status(404).json({
                    success: false,
                    error: `No se encontró un contrato con ID #${desembolsoData.id_cont}`
                });
            }
            
            // Crear el desembolso (el modelo valida estatus, cuenta Interno y normaliza alias legado)
            const cedulaEmprendedor =
              desembolsoData.cedula_desembolso ||
              contrato.cedula_persona_id ||
              contrato.id_cedula_aprob ||
              null;

            if (!cedulaEmprendedor) {
              return res.status(400).json({
                success: false,
                error: 'No se encontró la cédula del emprendedor en el contrato/aprobación',
              });
            }

            const resultado = await DesembolsoModel.create({
                id_cont: desembolsoData.id_cont,
                capture_desembolso: desembolsoData.capture_desembolso,
                fecha_desembolso: desembolsoData.fecha_desembolso,
                estatus_desembolso: 'Pendiente',
                cedula_desembolso: cedulaEmprendedor,
            });
            
            res.json({
                success: true,
                message: 'Desembolso registrado exitosamente',
                data: resultado
            });
            
        } catch (error) {
            console.error('Error en create:', error);
            const msg = error.message || 'Error al realizar el desembolso';
            const isClient =
              msg.includes('Pendiente por desembolso') ||
              msg.includes('cuenta bancaria') ||
              msg.includes('ya tiene un desembolso');
            res.status(isClient ? 400 : 500).json({
                success: false,
                error: msg
            });
        }
    },

    // Confirmar pago de desembolso (emprendedor) → Activo + cuotas
    async confirmarPago(req, res) {
        try {
            const { id } = req.params;
            const {
                fecha_confirmacion,
                cedula_usuario,
                nombre_rol,
                id_rol,
            } = req.body;

            const desembolsoExistente = await DesembolsoModel.getDesembolsoById(id);
            if (!desembolsoExistente) {
                return res.status(404).json({
                    success: false,
                    error: 'Desembolso no encontrado'
                });
            }

            if (desembolsoExistente.estatus_desembolso !== 'Pendiente') {
                return res.status(400).json({
                    success: false,
                    error: `El desembolso debe estar en estado "Pendiente". Estado actual: ${desembolsoExistente.estatus_desembolso}`
                });
            }

            const resultado = await DesembolsoModel.confirmarPago(id, {
                fecha_confirmacion:
                    fecha_confirmacion || new Date().toISOString().split('T')[0],
                cedula_usuario,
                nombre_rol,
                id_rol,
            });

            res.json({
                success: true,
                message: 'Desembolso confirmado. Cuotas generadas y contrato activo.',
                data: resultado
            });
        } catch (error) {
            console.error('Error en confirmarPago:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al confirmar el desembolso'
            });
        }
    },

    // Denegar desembolso (emprendedor) — requiere comprobante
    async denegarDesembolso(req, res) {
        try {
            const { id } = req.params;
            const {
                motivo_denegacion,
                comprobante_denegacion,
                cedula_usuario,
            } = req.body;

            if (!comprobante_denegacion) {
                return res.status(400).json({
                    success: false,
                    error: 'Debe adjuntar un comprobante o estado de cuenta que demuestre que el desembolso no llegó'
                });
            }

            const resultado = await DesembolsoModel.denegarDesembolso(id, {
                motivo_denegacion,
                comprobante_denegacion,
                cedula_usuario,
            });

            res.json({
                success: true,
                message: 'Desembolso denegado. El contrato volvió a Pendiente por desembolso.',
                data: resultado
            });
        } catch (error) {
            console.error('Error en denegarDesembolso:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al denegar el desembolso'
            });
        }
    }
};

module.exports = desembolsoController;