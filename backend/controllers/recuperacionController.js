// controllers/recuperacionController.js
const UsuarioModel = require('../models/usuarioModel');
const RecuperacionTokenModel = require('../models/RecuperacionTokenModel');
const emailService = require('../services/emailService');
const pool = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const recuperacionController = {
    // controllers/recuperacionController.js

async solicitarRecuperacion(req, res) {
    try {
        const { cedula_usuario } = req.body;

        if (!cedula_usuario) {
            return res.status(400).json({
                success: false,
                error: 'La cédula es requerida'
            });
        }

        // Buscar usuario por cédula
        const usuario = await UsuarioModel.getByCedula(cedula_usuario);
        
        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'No se encontró un usuario con esta cédula'
            });
        }

        // Filtrar por portal de origen (admin vs emprendedor)
        const origen = String(req.body.origen || req.query.origen || '').toLowerCase();
        const nombreRol = String(usuario.nombre_rol || usuario.rol || '').toLowerCase().trim();
        const esEmprendedor = nombreRol === 'emprendedor';

        if (origen === 'admin' && esEmprendedor) {
            return res.status(403).json({
                success: false,
                error: 'Esta cédula corresponde a un emprendedor. Usa el login de emprendedores para recuperar tu contraseña.'
            });
        }
        if (origen === 'emprendedor' && !esEmprendedor) {
            return res.status(403).json({
                success: false,
                error: 'Esta cédula corresponde a personal administrativo. Usa el login administrativo para recuperar tu contraseña.'
            });
        }

        // Verificar que el usuario tenga ID
        if (!usuario.id) {
            console.error('Usuario sin ID:', usuario);
            return res.status(500).json({
                success: false,
                error: 'Error interno: usuario sin ID'
            });
        }

        // Obtener correo del usuario
        let correo = usuario.correo;
        if (!correo && usuario.persona) {
            correo = usuario.persona.correo;
        }
        
        if (!correo) {
            return res.status(400).json({
                success: false,
                error: 'El usuario no tiene un correo electrónico registrado'
            });
        }

        const nombres = usuario.nombres || usuario.persona?.nombres || '';
        const apellidos = usuario.apellidos || usuario.persona?.apellidos || '';
        const nombreCompleto = `${nombres} ${apellidos}`.trim() || 'Usuario';

        // Verificar si ya hay token activo
        const hasActiveToken = await RecuperacionTokenModel.hasActiveToken(usuario.id);
        if (hasActiveToken) {
            return res.status(400).json({
                success: false,
                error: 'Ya tienes un código activo. Revisa tu correo o espera 1 minuto.'
            });
        }

        // Generar token y código
        const token = crypto.randomBytes(32).toString('hex');
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();

        // Guardar token - 1 MINUTO
        await RecuperacionTokenModel.create(usuario.id, token, codigo, 1);

        // Enviar correo
        await emailService.sendRecoveryEmail(correo, nombreCompleto, codigo, token);

        res.json({
            success: true,
            message: 'Código enviado a tu correo (válido por 1 minuto)',
            data: { token }
        });

    } catch (error) {
        console.error('Error en solicitarRecuperacion:', error);
        res.status(500).json({
            success: false,
            error: 'Error al procesar la solicitud: ' + error.message
        });
    }
},

    async verificarCodigo(req, res) {
        try {
            const { token, codigo } = req.body;

            if (!token || !codigo) {
                return res.status(400).json({
                    success: false,
                    error: 'Token y código son requeridos'
                });
            }

            const tokenData = await RecuperacionTokenModel.verifyToken(token, codigo);

            if (!tokenData) {
                // Verificar si expiró
                const tokenExists = await RecuperacionTokenModel.getByToken(token);
                if (tokenExists) {
                    if (tokenExists.usado) {
                        return res.status(400).json({
                            success: false,
                            error: 'Este código ya ha sido utilizado'
                        });
                    }
                    if (new Date(tokenExists.fecha_expiracion) < new Date()) {
                        return res.status(400).json({
                            success: false,
                            error: 'El código ha expirado (válido por 1 minuto). Solicita uno nuevo'
                        });
                    }
                }
                return res.status(400).json({
                    success: false,
                    error: 'Código inválido'
                });
            }

            res.json({
                success: true,
                message: 'Código verificado correctamente'
            });

        } catch (error) {
            console.error('Error en verificarCodigo:', error);
            res.status(500).json({
                success: false,
                error: 'Error al verificar el código'
            });
        }
    },

    async cambiarContrasenaConToken(req, res) {
        try {
            const { token, codigo, nueva_clave } = req.body;

            if (!token || !codigo || !nueva_clave) {
                return res.status(400).json({
                    success: false,
                    error: 'Todos los campos son requeridos'
                });
            }

            if (nueva_clave.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'La contraseña debe tener al menos 6 caracteres'
                });
            }

            const tokenData = await RecuperacionTokenModel.verifyToken(token, codigo);

            if (!tokenData) {
                return res.status(400).json({
                    success: false,
                    error: 'Código inválido o expirado'
                });
            }

            const usuario = await UsuarioModel.getById(tokenData.id_cedula_usuario);
            if (!usuario) {
                return res.status(404).json({
                    success: false,
                    error: 'Usuario no encontrado'
                });
            }

            const saltRounds = 10;
            const claveHasheada = await bcrypt.hash(nueva_clave, saltRounds);

            await UsuarioModel.updatePassword(usuario.id, claveHasheada);
            await RecuperacionTokenModel.markAsUsed(tokenData.id);

            // Enviar correo de confirmación
            const correo = usuario.correo || usuario.persona?.correo;
            const nombres = usuario.nombres || usuario.persona?.nombres || '';
            const apellidos = usuario.apellidos || usuario.persona?.apellidos || '';
            const nombreCompleto = `${nombres} ${apellidos}`.trim();

            if (correo) {
                await emailService.sendPasswordChangedEmail(correo, nombreCompleto);
            }

            res.json({
                success: true,
                message: 'Contraseña actualizada correctamente'
            });

        } catch (error) {
            console.error('Error en cambiarContrasenaConToken:', error);
            res.status(500).json({
                success: false,
                error: 'Error al cambiar la contraseña'
            });
        }
    },

    async reenviarCodigo(req, res) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    error: 'Token es requerido'
                });
            }

            const tokenData = await RecuperacionTokenModel.getByToken(token);
            
            if (!tokenData) {
                return res.status(404).json({
                    success: false,
                    error: 'Token no encontrado'
                });
            }

            if (tokenData.usado) {
                return res.status(400).json({
                    success: false,
                    error: 'Este token ya ha sido utilizado'
                });
            }

            const usuario = await UsuarioModel.getById(tokenData.id_cedula_usuario);
            if (!usuario) {
                return res.status(400).json({
                    success: false,
                    error: 'Usuario no encontrado'
                });
            }

            const correo = usuario.correo || usuario.persona?.correo;
            if (!correo) {
                return res.status(400).json({
                    success: false,
                    error: 'No se encontró correo electrónico'
                });
            }

            const nuevoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
            // CAMBIADO A 1 MINUTO
            const fechaExpiracion = new Date();
            fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 1); // 1 minuto
            
            await pool.query(
                `UPDATE recuperacion_tokens 
                 SET codigo = $1, fecha_expiracion = $2, intentos_fallidos = 0 
                 WHERE id = $3`,
                [nuevoCodigo, fechaExpiracion, tokenData.id]
            );

            const nombres = usuario.nombres || usuario.persona?.nombres || '';
            const apellidos = usuario.apellidos || usuario.persona?.apellidos || '';
            const nombreCompleto = `${nombres} ${apellidos}`.trim();

            await emailService.sendRecoveryEmail(correo, nombreCompleto, nuevoCodigo, token);

            res.json({
                success: true,
                message: 'Nuevo código enviado (válido por 1 minuto)'
            });

        } catch (error) {
            console.error('Error en reenviarCodigo:', error);
            res.status(500).json({
                success: false,
                error: 'Error al reenviar el código'
            });
        }
    }
};

module.exports = recuperacionController;