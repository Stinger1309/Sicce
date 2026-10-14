import api from './api_principal';

const configuracionContratoAPI = {
  // Obtener la configuración actual
  getCurrent: async () => {
    try {
      const response = await api.get('/configuracion_contrato/current');
      return response.data;
    } catch (error) {
      console.error('Error en getCurrent:', error);
      throw error.response?.data || { error: 'Error al obtener la configuración actual' };
    }
  },

  // Obtener todas las configuraciones (historial)
  getAll: async () => {
    try {
      const response = await api.get('/configuracion_contrato');
      return response.data;
    } catch (error) {
      console.error('Error en getAll:', error);
      throw error.response?.data || { error: 'Error al obtener las configuraciones' };
    }
  },

  // Obtener configuración por ID
  getById: async (id) => {
    try {
      const response = await api.get(`/configuracion_contrato/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error en getById:', error);
      throw error.response?.data || { error: 'Error al obtener la configuración' };
    }
  },

  // Crear nueva configuración
  create: async (configData) => {
    try {
      const response = await api.post('/configuracion_contrato', configData);
      return response.data;
    } catch (error) {
      console.error('Error en create:', error);
      throw error.response?.data || { error: 'Error al crear la configuración' };
    }
  },

  // Actualizar configuración
  update: async (id, configData) => {
    try {
      const response = await api.put(`/configuracion_contrato/${id}`, configData);
      return response.data;
    } catch (error) {
      console.error('Error en update:', error);
      throw error.response?.data || { error: 'Error al actualizar la configuración' };
    }
  },

  // Eliminar configuración
  delete: async (id) => {
    try {
      const response = await api.delete(`/configuracion_contrato/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error en delete:', error);
      throw error.response?.data || { error: 'Error al eliminar la configuración' };
    }
  },

  // Obtener historial de cambios
  getHistorial: async (id) => {
    try {
      const response = await api.get(`/configuracion_contrato/${id}/historial`);
      return response.data;
    } catch (error) {
      console.error('Error en getHistorial:', error);
      throw error.response?.data || { error: 'Error al obtener el historial' };
    }
  }
};

export default configuracionContratoAPI;