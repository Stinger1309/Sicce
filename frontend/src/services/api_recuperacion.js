import api from './api_principal'; // Importa la instancia principal

// Funciones de recuperación usando la API principal
const recuperacionAPI = {
    solicitarRecuperacion: async (cedula_usuario, origen = null) => {
        try {
            const body = { cedula_usuario };
            if (origen) body.origen = origen;
            const response = await api.post('/recuperacion/solicitar', body);
            return response.data;
        } catch (error) {
            console.error('Error en solicitarRecuperacion:', error);
            if (error.response) {
                return error.response.data;
            }
            return {
                success: false,
                error: 'Error de conexión con el servidor',
                code: 'CONNECTION_ERROR'
            };
        }
    },

    verificarCodigo: async (token, codigo) => {
        try {
            const response = await api.post('/recuperacion/verificar', { token, codigo });
            return response.data;
        } catch (error) {
            console.error('Error en verificarCodigo:', error);
            if (error.response) {
                return error.response.data;
            }
            return {
                success: false,
                error: 'Error de conexión con el servidor',
                code: 'CONNECTION_ERROR'
            };
        }
    },

    cambiarContrasena: async (token, codigo, nueva_clave) => {
        try {
            const response = await api.post('/recuperacion/cambiar', { 
                token, 
                codigo, 
                nueva_clave 
            });
            return response.data;
        } catch (error) {
            console.error('Error en cambiarContrasena:', error);
            if (error.response) {
                return error.response.data;
            }
            return {
                success: false,
                error: 'Error de conexión con el servidor',
                code: 'CONNECTION_ERROR'
            };
        }
    },

    reenviarCodigo: async (token) => {
        try {
            const response = await api.post('/recuperacion/reenviar', { token });
            return response.data;
        } catch (error) {
            console.error('Error en reenviarCodigo:', error);
            if (error.response) {
                return error.response.data;
            }
            return {
                success: false,
                error: 'Error de conexión con el servidor',
                code: 'CONNECTION_ERROR'
            };
        }
    },

    validarToken: async (token) => {
        try {
            const response = await api.get('/recuperacion/validar-token', {
                params: { token }
            });
            return response.data;
        } catch (error) {
            console.error('Error en validarToken:', error);
            if (error.response) {
                return error.response.data;
            }
            return {
                success: false,
                error: 'Error de conexión con el servidor',
                code: 'CONNECTION_ERROR'
            };
        }
    },

    verificarCorreo: async (cedula_usuario) => {
        try {
            const response = await api.post('/recuperacion/verificar-correo', { cedula_usuario });
            return response.data;
        } catch (error) {
            console.error('Error en verificarCorreo:', error);
            if (error.response) {
                return error.response.data;
            }
            return {
                success: false,
                error: 'Error de conexión con el servidor',
                code: 'CONNECTION_ERROR'
            };
        }
    }
};

export default recuperacionAPI;