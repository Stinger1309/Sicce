import api from './api_principal';

const DesembolsoAPI = {
    // Obtener todos los desembolsos
    getAll: async () => {
        try {
            const response = await api.get('/desembolso');
            return response;
        } catch (error) {
            console.error('Error en getAll desembolsos:', error);
            throw error.response?.data || { error: 'Error al obtener los desembolsos' };
        }
    },

    // Obtener desembolsos por cédula
    getByCedula: async (cedula) => {
        try {
            const response = await api.get(`/desembolso/cedula/${cedula}`);
            return response;
        } catch (error) {
            console.error('Error en getByCedula:', error);
            throw error.response?.data || { error: 'Error al obtener desembolsos por cédula' };
        }
    },

    // Obtener contratos pendientes por desembolso
    getContratosPendientes: async () => {
        try {
            const response = await api.get('/desembolso/contratos-pendientes');
            return response;
        } catch (error) {
            console.error('Error en getContratosPendientes:', error);
            throw error.response?.data || { error: 'Error al obtener contratos pendientes' };
        }
    },

    // Verificar si un contrato ya tiene desembolso
    verificarDesembolso: async (id_cont) => {
        try {
            const response = await api.get(`/desembolso/verificar/${id_cont}`);
            return response;
        } catch (error) {
            console.error('Error en verificarDesembolso:', error);
            throw error.response?.data || { error: 'Error al verificar desembolso' };
        }
    },

    // Crear nuevo desembolso
    create: async (desembolsoData) => {
        try {
            const response = await api.post('/desembolso', desembolsoData);
            return response;
        } catch (error) {
            console.error('Error en create desembolso:', error);
            throw error.response?.data || { error: 'Error al registrar el desembolso' };
        }
    },

    // Confirmar pago de desembolso
    confirmarPago: async (id, pagoData) => {
        try {
            const response = await api.put(`/desembolso/confirmar-pago/${id}`, pagoData);
            return response;
        } catch (error) {
            console.error('Error en confirmarPago:', error);
            throw error.response?.data || { error: 'Error al confirmar el pago' };
        }
    },

    // Denegar desembolso (requiere comprobante)
    denegarDesembolso: async (id, data) => {
        try {
            const response = await api.put(`/desembolso/denegar/${id}`, data);
            return response;
        } catch (error) {
            console.error('Error en denegarDesembolso:', error);
            throw error.response?.data || { error: 'Error al denegar el desembolso' };
        }
    }
};

export default DesembolsoAPI;