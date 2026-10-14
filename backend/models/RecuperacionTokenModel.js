// models/RecuperacionTokenModel.js
const pool = require('../config/db');

class RecuperacionTokenModel {
    // Crear token de recuperación (1 minuto)
    static async create(usuarioId, token, codigo, minutosExpiracion = 1) {
        const fechaExpiracion = new Date();
        fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + minutosExpiracion);
        
        try {
            // Desactivar tokens anteriores no usados
            await pool.query(
                'UPDATE recuperacion_tokens SET usado = TRUE WHERE id_cedula_usuario = $1 AND usado = FALSE',
                [usuarioId]
            );
            
            const result = await pool.query(
                `INSERT INTO recuperacion_tokens 
                 (id_cedula_usuario, token, codigo, fecha_expiracion)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [usuarioId, token, codigo, fechaExpiracion]
            );
            
            return result.rows[0];
        } catch (error) {
            console.error('Error en RecuperacionTokenModel.create:', error);
            throw error;
        }
    }

    // Verificar token y código
    static async verifyToken(token, codigo) {
        try {
            const result = await pool.query(
                `SELECT * FROM recuperacion_tokens 
                 WHERE token = $1 AND codigo = $2 
                 AND usado = FALSE 
                 AND fecha_expiracion > CURRENT_TIMESTAMP
                 AND intentos_fallidos < 5`,
                [token, codigo]
            );
            
            if (result.rows.length === 0) {
                // Registrar intento fallido
                await pool.query(
                    `UPDATE recuperacion_tokens 
                     SET intentos_fallidos = intentos_fallidos + 1,
                         ultimo_intento = CURRENT_TIMESTAMP
                     WHERE token = $1`,
                    [token]
                );
                return null;
            }
            
            return result.rows[0];
        } catch (error) {
            console.error('Error en RecuperacionTokenModel.verifyToken:', error);
            throw error;
        }
    }

    // Marcar token como usado
    static async markAsUsed(id) {
        try {
            const result = await pool.query(
                `UPDATE recuperacion_tokens 
                 SET usado = TRUE 
                 WHERE id = $1 
                 RETURNING *`,
                [id]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error en RecuperacionTokenModel.markAsUsed:', error);
            throw error;
        }
    }

    // Obtener token por token string
    static async getByToken(token) {
        try {
            const result = await pool.query(
                'SELECT * FROM recuperacion_tokens WHERE token = $1',
                [token]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error en RecuperacionTokenModel.getByToken:', error);
            throw error;
        }
    }

    // ✅ CORREGIDO: Verificar si existe token activo
    static async hasActiveToken(usuarioId) {
        try {
            const result = await pool.query(
                `SELECT * FROM recuperacion_tokens 
                 WHERE id_cedula_usuario = $1   
                 AND usado = FALSE 
                 AND fecha_expiracion > CURRENT_TIMESTAMP`,
                [usuarioId]
            );
            return result.rows.length > 0;
        } catch (error) {
            console.error('Error en RecuperacionTokenModel.hasActiveToken:', error);
            throw error;
        }
    }

    // Limpiar tokens expirados
    static async cleanExpired() {
        try {
            const result = await pool.query(
                `DELETE FROM recuperacion_tokens 
                 WHERE fecha_expiracion < CURRENT_TIMESTAMP 
                 OR usado = TRUE`
            );
            return result.rowCount;
        } catch (error) {
            console.error('Error en RecuperacionTokenModel.cleanExpired:', error);
            throw error;
        }
    }
}

module.exports = RecuperacionTokenModel;